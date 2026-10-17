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

        static Dictionary<string, string> mimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) {
            { ".html", "text/html; charset=utf-8" },
            { ".htm",  "text/html; charset=utf-8" },
            { ".css",  "text/css; charset=utf-8" },
            { ".js",   "application/javascript; charset=utf-8" },
            { ".json", "application/json; charset=utf-8" },
            { ".png",  "image/png" },
            { ".jpg",  "image/jpeg" },
            { ".jpeg", "image/jpeg" },
            { ".svg",  "image/svg+xml" },
            { ".ico",  "image/x-icon" },
            { ".webp", "image/webp" }
        };

        static void SafeLog(string msg, ConsoleColor? color = null) {
            try {
                if (color.HasValue) Console.ForegroundColor = color.Value;
                Console.WriteLine(msg);
                if (color.HasValue) Console.ResetColor();
            } catch {}
        }

        static void SetTitle(string title) {
            try {
                Console.Title = title;
            } catch {}
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
                SafeLog("Failed to bind any port (5000, 8080, 5050). Check firewall or permissions.", ConsoleColor.Red);
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

            // Write active port to a small text file so frontends/scripts can read it
            try {
                File.WriteAllText(Path.Combine(baseDir, "active_port.txt"), port.ToString());
            } catch {}

            // Launch browser if --open flag is present
            foreach (string arg in args) {
                if (arg.Equals("--open", StringComparison.OrdinalIgnoreCase)) {
                    try {
                        System.Diagnostics.Process.Start("http://localhost:" + port + "/");
                    } catch {}
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
                    int bytesRead = stream.Read(buffer, 0, buffer.Length);
                    if (bytesRead <= 0) { client.Close(); return; }
                    ms.Write(buffer, 0, bytesRead);

                    string rawHeader = Encoding.UTF8.GetString(ms.ToArray());
                    string[] lines = rawHeader.Split(new string[] { "\r\n" }, StringSplitOptions.None);
                    if (lines.Length == 0 || string.IsNullOrEmpty(lines[0])) { client.Close(); return; }

                    string[] requestLine = lines[0].Split(' ');
                    if (requestLine.Length < 2) { client.Close(); return; }

                    string method = requestLine[0].ToUpper();
                    string rawUrl = requestLine[1];
                    string path = rawUrl.Split('?')[0];

                    // Handle CORS preflight OPTIONS
                    if (method == "OPTIONS") {
                        SendResponse(stream, 200, "OK", "text/plain", new byte[0]);
                        client.Close();
                        return;
                    }

                    // Endpoint: /api/info
                    if (path.Equals("/api/info", StringComparison.OrdinalIgnoreCase)) {
                        string infoJson = "{\"status\":\"online\",\"port\":" + port + ",\"ip\":\"" + localIp + 
                                          "\",\"pcUrl\":\"http://localhost:" + port + "/\",\"mobileUrl\":\"http://" + localIp + ":" + port + "/\"}";
                        SendResponse(stream, 200, "OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes(infoJson));
                        client.Close();
                        return;
                    }

                    // Endpoint: /api/sync
                    if (path.Equals("/api/sync", StringComparison.OrdinalIgnoreCase)) {
                        if (method == "POST") {
                            int headerEnd = rawHeader.IndexOf("\r\n\r\n");
                            string body = "";
                            if (headerEnd >= 0) {
                                body = rawHeader.Substring(headerEnd + 4);
                            }
                            try {
                                File.WriteAllText(syncFile, body, Encoding.UTF8);
                            } catch {}
                            byte[] okResp = Encoding.UTF8.GetBytes("{\"status\":\"synced\"}");
                            SendResponse(stream, 200, "OK", "application/json; charset=utf-8", okResp);
                        } else {
                            byte[] syncBytes;
                            if (File.Exists(syncFile)) {
                                syncBytes = File.ReadAllBytes(syncFile);
                            } else {
                                syncBytes = Encoding.UTF8.GetBytes("{\"contacts\":[]}");
                            }
                            SendResponse(stream, 200, "OK", "application/json; charset=utf-8", syncBytes);
                        }
                        client.Close();
                        return;
                    }

                    // Support absolute URLs sent by reverse proxies (e.g. GET http://localhost:5000/index.html)
                    if (path.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || 
                        path.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) {
                        try {
                            Uri u = new Uri(path);
                            path = u.AbsolutePath;
                        } catch {}
                    }

                    // Static file serving
                    if (path == "/" || string.IsNullOrEmpty(path)) {
                        path = "/index.html";
                    }

                    string relPath = path.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                    string filePath = Path.GetFullPath(Path.Combine(baseDir, relPath));

                    // Directory traversal protection
                    if (!filePath.StartsWith(baseDir, StringComparison.OrdinalIgnoreCase)) {
                        SendResponse(stream, 403, "Forbidden", "text/plain", Encoding.UTF8.GetBytes("Access Denied"));
                        return;
                    }

                    if (File.Exists(filePath)) {
                        string ext = Path.GetExtension(filePath);
                        string mime = mimeTypes.ContainsKey(ext) ? mimeTypes[ext] : "application/octet-stream";
                        byte[] fileBytes = File.ReadAllBytes(filePath);
                        SendResponse(stream, 200, "OK", mime, fileBytes);
                    } else {
                        byte[] notFound = Encoding.UTF8.GetBytes("File Not Found: " + path);
                        SendResponse(stream, 404, "Not Found", "text/plain", notFound);
                    }
                }
            } catch (Exception) {
                // Client disconnected
            } finally {
                try { client.Client.Shutdown(SocketShutdown.Send); } catch {}
                try { client.Close(); } catch {}
            }
        }

        static void SendResponse(NetworkStream stream, int statusCode, string statusMsg, string contentType, byte[] body) {
            string headers = "HTTP/1.1 " + statusCode + " " + statusMsg + "\r\n" +
                             "Content-Type: " + contentType + "\r\n" +
                             "Content-Length: " + body.Length + "\r\n" +
                             "Access-Control-Allow-Origin: *\r\n" +
                             "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                             "Access-Control-Allow-Headers: Content-Type, Authorization\r\n" +
                             "Connection: close\r\n\r\n";
            byte[] headerBytes = Encoding.UTF8.GetBytes(headers);
            stream.Write(headerBytes, 0, headerBytes.Length);
            if (body.Length > 0) {
                stream.Write(body, 0, body.Length);
            }
            stream.Flush();
        }

        static string GetLocalIpAddress() {
            try {
                using (Socket socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0)) {
                    socket.Connect("8.8.8.8", 65530);
                    IPEndPoint endPoint = socket.LocalEndPoint as IPEndPoint;
                    if (endPoint != null) {
                        return endPoint.Address.ToString();
                    }
                }
            } catch {}
            return "127.0.0.1";
        }
    }
}
