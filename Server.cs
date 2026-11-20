using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace OrbitTracker {
    class Program {
        static int port = 5000;
        static string baseDir;
        static string localIp;
        static string syncFile;

        static readonly HashSet<string> publicFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase) {
            "index.html", "styles.css", "app.js", "google-sync.js", "manifest.json",
            "service-worker.js", "orbit.apk"
        };

        static Dictionary<string, string> mimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) {
            { ".html", "text/html; charset=utf-8" },
            { ".css",  "text/css; charset=utf-8" },
            { ".js",   "application/javascript; charset=utf-8" },
            { ".json", "application/json; charset=utf-8" },
            { ".png",  "image/png" },
            { ".apk",  "application/vnd.android.package-archive" }
        };

        static void SafeLog(string msg, ConsoleColor? color = null) {
            try {
                if (color.HasValue) Console.ForegroundColor = color.Value;
                Console.WriteLine(msg);
                if (color.HasValue) Console.ResetColor();
            } catch {}
        }

        static void SetTitle(string title) {
            try { Console.Title = title; } catch {}
        }

        static void Main(string[] args) {
            baseDir = AppDomain.CurrentDomain.BaseDirectory;
            syncFile = Path.Combine(baseDir, "data_sync.json");
            localIp = GetLocalIpAddress();

            int[] portsToTry = new int[] { 5000, 8080, 5050, 3000 };
            TcpListener server = null;
            foreach (int p in portsToTry) {
                try {
                    server = TcpListener.Create(p);
                    server.Start();
                    port = p;
                    break;
                } catch (Exception) {
                    server = null;
                }
            }

            if (server == null) {
                SafeLog("Failed to bind any port (5000, 8080, 5050, 3000). Check firewall or permissions.", ConsoleColor.Red);
                return;
            }

            SetTitle("Orbit Local & Mobile Sync Server (Port " + port + ")");
            SafeLog("================================================================", ConsoleColor.Cyan);
            SafeLog("   Orbit Social Circle Tracker - Native Sync Engine             ", ConsoleColor.Cyan);
            SafeLog("================================================================", ConsoleColor.Cyan);
            SafeLog("");
            SafeLog("  [PC Browser]     http://localhost:" + port + "/", ConsoleColor.Green);
            SafeLog("  [Android Phone]  http://" + localIp + ":" + port + "/", ConsoleColor.Green);
            SafeLog("");
            SafeLog("  Hosting files from: " + baseDir, ConsoleColor.DarkGray);
            SafeLog("  Server is active. Keep this window open while using Orbit.", ConsoleColor.DarkGray);
            SafeLog("================================================================", ConsoleColor.Cyan);

            try { File.WriteAllText(Path.Combine(baseDir, "active_port.txt"), port.ToString()); } catch {}

            foreach (string arg in args) {
                if (arg.Equals("--open", StringComparison.OrdinalIgnoreCase)) {
                    try { System.Diagnostics.Process.Start("http://localhost:" + port + "/"); } catch {}
                }
            }

            while (true) {
                try {
                    TcpClient client = server.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(HandleClient, client);
                } catch (Exception) {
                    break;
                }
            }
        }

        static void HandleClient(object obj) {
            TcpClient client = (TcpClient)obj;
            try {
                try { client.LingerState = new LingerOption(true, 5); } catch {}
                using (NetworkStream stream = client.GetStream())
                using (MemoryStream ms = new MemoryStream()) {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    int headerEnd = -1;
                    int contentLength = 0;
                    while ((bytesRead = stream.Read(buffer, 0, buffer.Length)) > 0) {
                        ms.Write(buffer, 0, bytesRead);
                        byte[] soFar = ms.ToArray();
                        string text = Encoding.UTF8.GetString(soFar);
                        headerEnd = text.IndexOf("\r\n\r\n", StringComparison.Ordinal);
                        if (headerEnd >= 0) {
                            foreach (string line in text.Substring(0, headerEnd).Split(new string[] { "\r\n" }, StringSplitOptions.None)) {
                                if (line.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase)) {
                                    int.TryParse(line.Substring(15).Trim(), out contentLength);
                                }
                            }
                            if (soFar.Length >= headerEnd + 4 + contentLength) break;
                        }
                        if (ms.Length > 16 * 1024 * 1024) break;
                    }

                    string rawHeader = Encoding.UTF8.GetString(ms.ToArray());
                    string[] lines = rawHeader.Split(new string[] { "\r\n" }, StringSplitOptions.None);
                    if (lines.Length == 0 || string.IsNullOrEmpty(lines[0])) { client.Close(); return; }

                    string[] requestLine = lines[0].Split(' ');
                    if (requestLine.Length < 2) { client.Close(); return; }

                    string method = requestLine[0].ToUpper();
                    string path = requestLine[1].Split('?')[0];

                    // Normalize absolute URLs sent by reverse proxies before routing.
                    if (path.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                        path.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) {
                        try { path = new Uri(path).AbsolutePath; } catch {}
                    }

                    if (method == "OPTIONS") {
                        SendResponse(stream, 204, "No Content", "text/plain", new byte[0], false);
                        return;
                    }

                    if (path.Equals("/api/info", StringComparison.OrdinalIgnoreCase)) {
                        string infoJson = "{\"status\":\"online\",\"port\":" + port + ",\"ip\":\"" + localIp +
                                          "\",\"pcUrl\":\"http://localhost:" + port + "/\",\"mobileUrl\":\"http://" + localIp + ":" + port + "/\"}";
                        SendResponse(stream, 200, "OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes(infoJson), false);
                        return;
                    }

                    if (path.Equals("/api/sync", StringComparison.OrdinalIgnoreCase)) {
                        if (method == "POST") {
                            string body = headerEnd >= 0 && rawHeader.Length >= headerEnd + 4
                                ? rawHeader.Substring(headerEnd + 4, Math.Min(contentLength, rawHeader.Length - headerEnd - 4))
                                : "";
                            try {
                                string tmp = syncFile + ".tmp";
                                File.WriteAllText(tmp, body, new UTF8Encoding(false));
                                File.Delete(syncFile);
                                File.Move(tmp, syncFile);
                            } catch (Exception e) {
                                SafeLog("Sync write failed: " + e.Message, ConsoleColor.Red);
                                SendResponse(stream, 500, "Internal Server Error", "text/plain", Encoding.UTF8.GetBytes("Write failed"), false);
                                return;
                            }
                            SendResponse(stream, 200, "OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes("{\"status\":\"synced\"}"), false);
                        } else {
                            byte[] syncBytes = File.Exists(syncFile)
                                ? File.ReadAllBytes(syncFile)
                                : Encoding.UTF8.GetBytes("{\"contacts\":[]}");
                            SendResponse(stream, 200, "OK", "application/json; charset=utf-8", syncBytes, false);
                        }
                        return;
                    }

                    // Static files: whitelist only the web app assets, never scripts, tokens or data files.
                    if (method != "GET") {
                        SendResponse(stream, 405, "Method Not Allowed", "text/plain", new byte[0], false);
                        return;
                    }
                    if (path == "/" || string.IsNullOrEmpty(path)) path = "/index.html";

                    string relPath = path.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                    string filePath = Path.GetFullPath(Path.Combine(baseDir, relPath));
                    string name = Path.GetFileName(filePath);
                    bool isIcon = relPath.StartsWith("icons" + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
                                  && mimeTypes.ContainsKey(Path.GetExtension(filePath));

                    if (!filePath.StartsWith(baseDir, StringComparison.OrdinalIgnoreCase) ||
                        (!publicFiles.Contains(name) && !isIcon) || !File.Exists(filePath)) {
                        SendResponse(stream, 404, "Not Found", "text/plain", Encoding.UTF8.GetBytes("Not Found"), false);
                        return;
                    }

                    string ext = Path.GetExtension(filePath);
                    string mime = mimeTypes.ContainsKey(ext) ? mimeTypes[ext] : "application/octet-stream";
                    // Local dev server: always serve the latest files.
                    SendResponse(stream, 200, "OK", mime, File.ReadAllBytes(filePath), false);
                }
            } catch (Exception) {
                // Client disconnected
            } finally {
                try { client.Client.Shutdown(SocketShutdown.Send); } catch {}
                try { client.Close(); } catch {}
            }
        }

        static void SendResponse(NetworkStream stream, int statusCode, string statusMsg, string contentType, byte[] body, bool cacheable) {
            string headers = "HTTP/1.1 " + statusCode + " " + statusMsg + "\r\n" +
                             "Content-Type: " + contentType + "\r\n" +
                             "Content-Length: " + body.Length + "\r\n" +
                             "Cache-Control: " + (cacheable ? "public, max-age=3600" : "no-store") + "\r\n" +
                             "X-Content-Type-Options: nosniff\r\n" +
                             "Connection: close\r\n\r\n";
            byte[] headerBytes = Encoding.UTF8.GetBytes(headers);
            stream.Write(headerBytes, 0, headerBytes.Length);
            if (body.Length > 0) stream.Write(body, 0, body.Length);
            stream.Flush();
        }

        static string GetLocalIpAddress() {
            try {
                using (Socket socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0)) {
                    socket.Connect("8.8.8.8", 65530);
                    IPEndPoint endPoint = socket.LocalEndPoint as IPEndPoint;
                    if (endPoint != null) return endPoint.Address.ToString();
                }
            } catch {}
            return "127.0.0.1";
        }
    }
}
