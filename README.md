# Tab Limiter Chrome Extension 
**Version:**  0.1
A Chrome extension that automatically closes the oldest open tabs when the total number exceeds a user-specified limit. It helps manage browser tab clutter, improves performance, and provides several customizable features.

## Features 
 
- **Tab Limiting:**  Automatically closes the oldest non-pinned, non-excluded tabs when the limit is exceeded.
 
- **Exclude URLs/Domains:**  Allows users to specify domains or URLs to exclude from automatic tab closing.
 
- **Pinned Tabs Protection:**  Pinned tabs are ignored and never closed automatically.
 
- **Tab Count Badge:**  Displays the current number of open tabs on the extension's icon.
 
- **Notifications:**  Shows a notification when tabs are closed automatically.
 
- **Quick Settings Popup:**  Provides a popup UI to view tab statistics and adjust settings quickly.

## Installation 
 
1. **Clone or Download the Repository:** 

```Copy code
git clone https://github.com/armancohan/tab-limiter.git
```

Or download the ZIP and extract it.
 
2. **Load the Extension in Chrome:**  
  - Open Chrome and navigate to `chrome://extensions/`.
 
  - Enable **Developer mode**  by toggling the switch in the top-right corner.
 
  - Click on **Load unpacked**  and select the extension's directory.

## Usage 

### Setting the Maximum Tab Limit and Exclusions 
 
- **Via Popup:** 
  - Click the extension icon to open the popup.
 
  - Adjust the "Maximum tabs" value and click **Save** .

  - View the current total number of open tabs.
 
  - Click **More Options**  to access additional settings.
 
- **Via Options Page:**  
  - Right-click the extension icon and select **Options** , or go to `chrome://extensions/`, find **Tab Limiter** , and click **Details**  > **Extension options** .

  - Set your desired maximum number of tabs.

  - Input domains or URLs to exclude from automatic closing (one per line).
 
  - Click **Save** .

### Automatic Tab Management 

- The extension monitors your open tabs and automatically closes the oldest ones (excluding pinned and excluded tabs) when your specified limit is exceeded.

- Notifications inform you how many tabs were closed to maintain the limit.

- The extension icon displays a badge with the current number of open tabs.

## Screenshots 


*Popup UI showing tab count and quick settings.*

*Options page for setting tab limit and exclusions.*
## Development 

### Building from Source 
 
1. **Install Dependencies (if any):** 
  - This extension uses plain JavaScript and does not require additional build tools.
 
2. **Modify the Code:** 
  - Make changes to the extension's files as needed.
 
3. **Reload the Extension:**  
  - After making changes, reload the extension in `chrome://extensions/` to apply updates.

### File Structure 
 
- `manifest.json` - Extension configuration.
 
- `background.js` - Background script handling tab management.
 
- `options.html` & `options.js` - Options page for settings.
 
- `popup.html` & `popup.js` - Popup UI for quick access.
 
- `icons/` - Directory containing icon images.
 
- `screenshots/` - Directory for README images (not included in the extension).

## Contributing 

Contributions are welcome! Please submit a pull request or open an issue to discuss improvements or report bugs.

## License 
This project is licensed under the [MIT License]() .

## Contact 
Feel free to open issues.
