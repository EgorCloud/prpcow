const fs = require("fs");
const path = require("path");
const distPath = path.join(__dirname, "../dist");
if(fs.existsSync(distPath)){
    fs.rmdirSync(distPath, { recursive: true }); 
}
