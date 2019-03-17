define([], function () {
    var config = {};
    
    config.primaryColor = "#0d47a1";
    config.accentColor = "1b5e20";
    config.extensionName = "Passive Data Kit";
    config.uploadUrl = "https://pdk.audacious-software.com/data/add-bundle.json";
    config.generator = "pdk-web-visit";
    config.aboutExtension = "This is the basic web usage uploader extension from the Passive Data Kit project. It is intended to be customized on a per-project basis. For more information, contact <a href='mailto:pdk@audacious-software.com'>pdk@audacious-software.com</a>.";

    return config;
});