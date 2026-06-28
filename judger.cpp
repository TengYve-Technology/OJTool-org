#include<iostream>
#include<fstream>
#include<vector>
#include<string>
#include<algorithm>
#include<sstream>
#include<windows.h>
#include<cstring>
using namespace std;

enum JudgeResult {
	AC,
	CE,
	RTE,
	TLE,
	OLE,
	WA
};

string trim(const string& s) {
	size_t start = s.find_first_not_of(" \t\r\n");
	size_t end = s.find_last_not_of(" \t\r\n");
	return (start == string::npos || end == string::npos) ? "" : s.substr(start, end - start + 1);
}

string sanitizePath(const string& input) {
	string result;
	for (char c : input) {
		if (c != '"' && c != ';' && c != '|' && c != '&' && c != '$' && c != '`' && c != '\n' && c != '\r') {
			result += c;
		}
	}
	return result;
}

string expandEnvVars(const string& input) {
	DWORD needed = ExpandEnvironmentStringsA(input.c_str(), NULL, 0);
	if (needed == 0) {
		return input;
	}
	vector<char> expanded(needed);
	DWORD result = ExpandEnvironmentStringsA(input.c_str(), expanded.data(), needed);
	if (result > 0 && result <= needed) {
		return string(expanded.data());
	}
	return input;
}

string parseJsonString(const string& content, const string& key) {
	string searchKey = "\"" + key + "\"";
	size_t pos = content.find(searchKey);
	if (pos == string::npos) return "";

	size_t colonPos = content.find(":", pos + searchKey.length());
	if (colonPos == string::npos) return "";

	size_t startQuote = content.find("\"", colonPos + 1);
	if (startQuote == string::npos) return "";

	size_t endQuote = content.find("\"", startQuote + 1);
	if (endQuote == string::npos) return "";

	return content.substr(startQuote + 1, endQuote - startQuote - 1);
}

int parseJsonInt(const string& content, const string& key) {
	string searchKey = "\"" + key + "\"";
	size_t pos = content.find(searchKey);
	if (pos == string::npos) return 0;

	size_t colonPos = content.find(":", pos + searchKey.length());
	if (colonPos == string::npos) return 0;

	size_t start = content.find_first_of("-0123456789", colonPos + 1);
	if (start == string::npos) return 0;

	size_t end = start;
	while (end < content.length() && (isdigit(content[end]) || content[end] == '-')) {
		end++;
	}

	return atoi(content.substr(start, end - start).c_str());
}

bool fileExists(const string& filename) {
	return GetFileAttributesA(filename.c_str()) != INVALID_FILE_ATTRIBUTES;
}

bool readFileToVector(const string& filename, vector<string>& lines) {
	lines.clear();
	if (!fileExists(filename)) {
		cerr << "错误: 文件不存在 " << filename << endl;
		return false;
	}
	ifstream fin(filename);
	if (!fin.is_open()) {
		cerr << "错误: 无法打开文件 " << filename << endl;
		return false;
	}
	string line;
	while (getline(fin, line)) {
		lines.push_back(trim(line));
	}
	fin.close();
	return true;
}

long long getFileSize(const string& filename) {
	WIN32_FILE_ATTRIBUTE_DATA fileAttr = {0};
	if (!GetFileAttributesExA(filename.c_str(), GetFileExInfoStandard, &fileAttr)) {
		return 0;
	}
	return ((long long)fileAttr.nFileSizeHigh << 32) | fileAttr.nFileSizeLow;
}

bool copyFile(const string& srcPath, const string& dstPath) {
	if (fileExists(dstPath)) {
		DeleteFileA(dstPath.c_str());
	}
	ifstream src(srcPath, ios::binary);
	ofstream dst(dstPath, ios::binary);
	if (!src.is_open() || !dst.is_open()) {
		cerr << "错误: 复制文件失败 " << srcPath << " -> " << dstPath << endl;
		return false;
	}
	dst << src.rdbuf();
	src.close();
	dst.close();
	return true;
}

bool deleteFile(const string& filename) {
	if (!fileExists(filename)) {
		return true;
	}
	return DeleteFileA(filename.c_str()) != 0;
}

bool runCommand(const string& cmdLine, const string& workDir, int& exitCode) {
	STARTUPINFOA si = {0};
	PROCESS_INFORMATION pi = {0};
	si.cb = sizeof(STARTUPINFOA);
	si.dwFlags = STARTF_USESHOWWINDOW;
	si.wShowWindow = SW_HIDE;

	vector<char> cmdBuffer(cmdLine.size() + 1);
	copy(cmdLine.begin(), cmdLine.end(), cmdBuffer.begin());
	cmdBuffer[cmdLine.size()] = '\0';

	if (!CreateProcessA(NULL, cmdBuffer.data(), NULL, NULL, FALSE, 0, NULL, workDir.c_str(), &si, &pi)) {
		cerr << "错误: 创建进程失败，错误码：" << GetLastError() << endl;
		return false;
	}

	WaitForSingleObject(pi.hProcess, INFINITE);
	GetExitCodeProcess(pi.hProcess, (LPDWORD)&exitCode);

	CloseHandle(pi.hProcess);
	CloseHandle(pi.hThread);
	return true;
}

JudgeResult runProgramWithCheck(const string& exePath, const string& workDir, const string& inFile, const string& outFile, int timeLimitMs) {
	SECURITY_ATTRIBUTES sa = {0};
	sa.nLength = sizeof(SECURITY_ATTRIBUTES);
	sa.bInheritHandle = TRUE;
	sa.lpSecurityDescriptor = NULL;

	HANDLE hInput = CreateFileA(inFile.c_str(), GENERIC_READ,
		FILE_SHARE_READ, &sa, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);

	if (hInput == INVALID_HANDLE_VALUE) {
		cerr << "错误: 无法打开输入文件 " << inFile << endl;
		return RTE;
	}

	HANDLE hOutput = CreateFileA(outFile.c_str(), GENERIC_WRITE,
		FILE_SHARE_READ, &sa, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);

	if (hOutput == INVALID_HANDLE_VALUE) {
		cerr << "错误: 无法创建输出文件 " << outFile << endl;
		CloseHandle(hInput);
		return RTE;
	}

	STARTUPINFOA si = {0};
	PROCESS_INFORMATION pi = {0};
	si.cb = sizeof(STARTUPINFOA);
	si.dwFlags = STARTF_USESTDHANDLES | STARTF_USESHOWWINDOW;
	si.hStdInput = hInput;
	si.hStdOutput = hOutput;
	si.hStdError = GetStdHandle(STD_ERROR_HANDLE);
	si.wShowWindow = SW_HIDE;

	string cmdStr = "\"" + exePath + "\"";
	vector<char> cmdBuffer(cmdStr.size() + 1);
	copy(cmdStr.begin(), cmdStr.end(), cmdBuffer.begin());
	cmdBuffer[cmdStr.size()] = '\0';

	if (!CreateProcessA(NULL, cmdBuffer.data(), NULL, NULL, TRUE, 0, NULL, workDir.c_str(), &si, &pi)) {
		cerr << "错误: 创建选手程序失败，错误码：" << GetLastError() << endl;
		CloseHandle(hInput);
		CloseHandle(hOutput);
		return RTE;
	}

	DWORD waitResult = WaitForSingleObject(pi.hProcess, timeLimitMs);
	JudgeResult result = AC;

	if (waitResult == WAIT_TIMEOUT) {
		TerminateProcess(pi.hProcess, 1);
		result = TLE;
	} else if (waitResult == WAIT_OBJECT_0) {
		DWORD exitCode;
		GetExitCodeProcess(pi.hProcess, &exitCode);
		if (exitCode != 0) {
			result = RTE;
		}
	} else {
		result = RTE;
	}

	CloseHandle(pi.hProcess);
	CloseHandle(pi.hThread);
	CloseHandle(hInput);
	CloseHandle(hOutput);
	return result;
}

JudgeResult compareAnswer(const string& playerOutFile, const string& ansFile, long long outputLimit) {
	vector<string> playerLines, ansLines;
	if (!readFileToVector(playerOutFile, playerLines) || !readFileToVector(ansFile, ansLines)) {
		return RTE;
	}

	if (getFileSize(playerOutFile) > outputLimit) {
		return OLE;
	}

	int p_idx = 0, a_idx = 0;
	while (p_idx < playerLines.size() || a_idx < ansLines.size()) {
		while (p_idx < playerLines.size() && playerLines[p_idx].empty()) p_idx++;
		while (a_idx < ansLines.size() && ansLines[a_idx].empty()) a_idx++;

		if ((p_idx < playerLines.size()) != (a_idx < ansLines.size())) {
			return WA;
		}
		if (p_idx >= playerLines.size() && a_idx >= ansLines.size()) {
			break;
		}
		if (playerLines[p_idx] != ansLines[a_idx]) {
			return WA;
		}
		p_idx++;
		a_idx++;
	}
	return AC;
}

string resultToString(JudgeResult res) {
	switch(res) {
		case AC: return "Accepted";
		case CE: return "Compile Error";
		case RTE: return "Runtime Error";
		case TLE: return "Time Limit Exceeded";
		case OLE: return "Output Limit Exceeded";
		case WA: return "Wrong Answer";
		default: return "Unknown";
	}
}

bool readConfigFile(const string& configPath, string& problem_prefix, int& test_case_count, int& player_count, string& base_path, int& time_limit_ms, int& score_per_case, int& cppVersion, long long& output_limit) {
	ifstream fin(configPath);
	if (!fin.is_open()) {
		cerr << "错误: 无法打开配置文件 " << configPath << endl;
		return false;
	}

	string content, line;
	while (getline(fin, line)) {
		content += line + "\n";
	}
	fin.close();

	string prefix = parseJsonString(content, "problemPrefix");
	if (!prefix.empty()) problem_prefix = prefix;

	int tc = parseJsonInt(content, "testCaseCount");
	if (tc > 0) test_case_count = tc;

	int pc = parseJsonInt(content, "playerCount");
	if (pc > 0) player_count = pc;

	int tl = parseJsonInt(content, "timeLimitMs");
	if (tl > 0) time_limit_ms = tl;

	int sc = parseJsonInt(content, "scorePerCase");
	if (sc > 0) score_per_case = sc;

	int ver = parseJsonInt(content, "cppVersion");
	if (ver > 0) cppVersion = ver;

	int ol = parseJsonInt(content, "outputLimitKb");
	if (ol > 0) output_limit = (long long)ol * 1024;

	string bp = parseJsonString(content, "basePath");
	if (!bp.empty()) {
		base_path = expandEnvVars(bp);
	}

	return true;
}

int main() {
	system("chcp 936");
	string problem_prefix = "";
	int test_case_count = 0;
	int player_count = 0;
	string base_path = "";
	int time_limit_ms = 1000;
	int score_per_case = 10;
	int cppver = 17;
	long long output_limit = 1024 * 1024;

	char useConfig = 'n';
	cout << "是否读取配置文件(y/n,默认n): ";
	cin >> useConfig;

	if (useConfig == 'y' || useConfig == 'Y') {
		string configPath;
		cout << "输入配置文件路径: ";
		cin >> configPath;
		if (!readConfigFile(configPath, problem_prefix, test_case_count, player_count, base_path, time_limit_ms, score_per_case, cppver, output_limit)) {
			return 1;
		}
	} else {
		cout << "===== 输入参数 =====" << endl;
		cout << "题目前缀: "; cin >> problem_prefix;
		cout << "测试用例数: "; cin >> test_case_count;
		cout << "选手人数: "; cin >> player_count;
		cout << "根路径: "; cin >> base_path;
		cout << "限时时间(ms): "; cin >> time_limit_ms;
		cout << "每测试点分值: "; cin >> score_per_case;
		cout << "C++版本: "; cin >> cppver;
		cout << "输出限制(KB): "; cin >> output_limit;
		output_limit *= 1024;
	}

	for (int pid = 1; pid <= player_count; ++pid) {
		int total = 0;
		bool ce = false;
		string pdir = base_path + to_string(pid) + "\\";
		string cpp = pdir + problem_prefix + ".cpp";
		string exe = pdir + problem_prefix + ".exe";
		string in = pdir + problem_prefix + ".in";
		string out = pdir + problem_prefix + ".out";
		string res = pdir + problem_prefix + "_out.txt";

		ofstream fout(res);
		fout << "Player " << pid << endl;
		cout << "\n===== 选手 " << pid << " =====\n";

		for (int cid = 1; cid <= test_case_count; ++cid) {
			JudgeResult r = AC;
			string cin = base_path + problem_prefix + to_string(cid) + ".in";
			string cans = base_path + problem_prefix + to_string(cid) + ".ans";
			int sc = 0;

			if (ce) {
				r = CE;
			} else {
				if (cid == 1) {
					string safeCpp = sanitizePath(cpp);
					string safeExe = sanitizePath(exe);
					string cmd = "g++ \"" + safeCpp + "\" -o \"" + safeExe + "\" -std=c++"+to_string(cppver)+" -O2";
					int exitCode = 0;
					if (!runCommand(cmd, pdir, exitCode) || exitCode != 0 || !fileExists(exe)) {
						r = CE;
						ce = true;
					}
				}
				if (!ce) {
					r = runProgramWithCheck(exe, pdir, cin, out, time_limit_ms);
					if (r == AC) {
						if (fileExists(out)) {
							r = compareAnswer(out, cans, output_limit);
						} else {
							r = RTE;
						}
					}
				}
			}

			if (r == AC) {
				sc = score_per_case;
				total += sc;
			}
			cout << cid << ": " << resultToString(r) << endl;
			fout << cid << " " << sc << " " << resultToString(r) << endl;
		}

		fout << total << endl;
		fout.close();
		cout << "总得分: " << total << " / " << test_case_count * score_per_case << endl;
	}

	cout << "\n全部完成！" << endl;
	system("pause");
	return 0;
}
