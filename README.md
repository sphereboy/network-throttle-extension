# 🌐 Network Throttle Controller

> Because sometimes you need to slow things down to speed up your development! 🐌

A Chrome extension that lets you simulate different network conditions right from your browser. Perfect for testing how your web apps behave when the internet decides to take a coffee break. ☕

## 🚀 Features

- 🚅 Multiple network profiles:

  - Regular 3G (for that vintage mobile experience)
  - Fast 3G (when you're feeling a bit more modern)
  - Slow Connection (aka "Coffee Break Mode")
  - Offline Mode (for when you want to pretend it's 1985)
  - No Throttling (back to the future!)

- 💾 Persistent settings (because who likes repeating themselves?)
- 🎯 Per-tab throttling (other tabs can stay zippy)
- 👀 Visual feedback (so you know what's actually happening)

## 🔧 Installation

1. Clone this repository

   ```bash
   git clone https://github.com/yourusername/network-throttle-extension.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right

4. Click "Load unpacked" and select the extension directory

5. 🎉 Ready to throttle! (That sounds wrong, but you know what we mean)

## 🎮 Usage

1. Click the extension icon in your Chrome toolbar
2. Select your desired network profile
3. Click "Apply Throttling"
4. Watch your internet connection pretend it's having a bad day

## 🤔 Why Use This?

- Test your web apps under different network conditions
- Empathize with users on slower connections
- Pretend you're in a coffee shop with terrible WiFi
- Appreciate your actual internet speed more

## 🧪 Network Profiles

| Profile    | Download | Upload   | Latency | Use Case                 |
| ---------- | -------- | -------- | ------- | ------------------------ |
| Regular 3G | 750 Kbps | 250 Kbps | 100ms   | Basic mobile testing     |
| Fast 3G    | 1.5 Mbps | 750 Kbps | 40ms    | Better mobile experience |
| Slow       | 100 Kbps | 50 Kbps  | 500ms   | Edge case testing        |
| Offline    | 0        | 0        | ∞       | Offline functionality    |

## 🛠️ Technical Details

Built with:

- Chrome Extension Manifest V3
- Chrome Debugger API
- Pure JavaScript (no frameworks, we keep it simple!)
- A sprinkle of Material Design inspiration

## 📝 License

MIT License - Feel free to throttle your connection however you like!

## 🤝 Contributing

Found a bug? Want to add "Dial-up Internet" mode? PRs welcome!

## ⚠️ Disclaimer

This extension doesn't actually make your internet worse (that's what your ISP is for 😉).
