const fs = require("fs");
const path = require("path");

const buildDir = path.join(__dirname, "../dist");
(() => {
    fs.readdir(buildDir, (error, items) => {
        if (error) {
            throw error;
        }
        
        items.filter((item) =>
            fs.statSync(path.join(buildDir, item)).isDirectory()
        ).forEach((dir) => {
            const packageJsonFile = path.join(buildDir, dir, "/package.json");
            if (!fs.existsSync(packageJsonFile)) {
                fs.copyFileSync(
                    path.join(__dirname, "../package.json"),
                    packageJsonFile
                );
            }
            switch (dir) {
                case "cjs":
                    fs.readFile(packageJsonFile, "utf8", (err, data) => {
                        if (err) {
                            throw err;
                        }
                        const packageJson = JSON.parse(data);
                        packageJson.type = "commonjs";
                        fs.writeFileSync(
                            packageJsonFile,
                            JSON.stringify(packageJson, null, 2),
                            "utf8"
                        );
                    });
                    break;
                case "esm":
                    fs.readFile(packageJsonFile, "utf8", (err, data) => {
                        if (err) {
                            throw err;
                        }
                        const packageJson = JSON.parse(data);
                        packageJson.type = "module";
                        fs.writeFileSync(
                            packageJsonFile,
                            JSON.stringify(packageJson, null, 2),
                            "utf8"
                        );
                    });
                    break;
                default:
                    break;
            }
        });
    });
})();
