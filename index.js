const fs = require("fs");
const path = require("path");

// If you ever need to open the same DB file, we save instances of the DB here
const instances = {};
class Database {
    /**
     * @typedef {object} SnapshotOptions
     * @property {boolean} [enabled=false] Whether the snapshots are enabled
     * @property {number} [interval=86400000] The interval between each snapshot
     * @property {string} [path='./backups/'] The path of the backups
     */

    /**
     * @typedef {object} DatabaseOptions
     * @property {SnapshotOptions} snapshots
     */

    /**
     * @param {string} filePath The path of the json file used for the database.
     * @param {DatabaseOptions} options
     */
    constructor(filePath, options) {
        if (!(filePath && typeof filePath === "string")) throw new Error("Provide a valid file path for the database");

        if (instances[filePath]) {
            // if we return an existing instance, javascript will use it instead
            // see https://stackoverflow.com/questions/11145159/implement-javascript-instance-store-by-returning-existing-instance-from-construc
            return instances[filePath];
        }

        /**
         * The path of the json file used as database.
         * @type {string}
         */
        this.jsonFilePath = filePath;
        instances[filePath] = this;

        /**
         * The options for the database
         * @type {DatabaseOptions}
         */
        this.options = options || {};

        if (this.options.snapshots && this.options.snapshots.enabled) {
            const path = this.options.snapshots.path;
            if (!(path && typeof path === "string")) throw new Error("Provide a valid file path for database snapshots");
            if (typeof this.options.snapshots.interval !== "number") throw new Error("Provide the interval in milliseconds for snapshot creation");

            if (!fs.existsSync(path)) {
                fs.mkdirSync(path);
            }
            setInterval(() => {
                this.makeSnapshot(path);
            }, this.options.snapshots.interval);
        }

        /**
         * The data stored in the database.
         * @type {object}
         */
        this.data = {};

        if (!fs.existsSync(this.jsonFilePath)) {
            const parentPath = path.dirname(this.jsonFilePath);
            if (!fs.existsSync(parentPath)) {
                fs.mkdirSync(parentPath);
            }
            fs.writeFileSync(this.jsonFilePath, "{}", "utf-8");
        } else {
            this.fetchDataFromFile();
        }
    }


    /**
     * Get data from the json file and store it in the data property.
     * Can be used to resync with the saved file, just be careful that local changes are saved.
     */
    fetchDataFromFile() {
        const savedData = JSON.parse(fs.readFileSync(this.jsonFilePath));
        if (typeof savedData === "object") {
            this.data = savedData;
        } else {
            // parsed a string or something
            throw new Error("Data is not a valid object");
        }
    }
    /**
     * Write data to the json file.
     */
    saveDataToFile() {
        fs.writeFileSync(this.jsonFilePath, JSON.stringify(this.data, null, 2), "utf-8");
    }

    /**
     * Make a snapshot of the database and save it in the snapshot folder
     * @param {string} folderPath The path where the snapshot will be stored
     */
    makeSnapshot(folderPath) {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }

        // we want something like "snapshot-database-14278912741.json" from "snapshots/database.json"
        // get the last file name, split by dot, and remove the file ext then join the rest again
        const splitName = path.basename(this.jsonFilePath).split(".");
        splitName.pop();

        const databaseName = splitName.join(".");
        const fileName = `snapshot-${databaseName}-${Date.now()}.json`;
        fs.writeFileSync(path.join(folderPath, fileName));
    }

    /**
     * Get data for a key in the database
     * @param {string} key 
     */
    get(key) {
        return this.data[key];
    }
    /**
     * Set new data for a key in the database.
     * @param {string} key
     * @param {*} value 
     */
    set(key, value) {
        this.data[key] = value;
        this.saveDataToFile();
    }
    /**
     * Set new data locally (not saved to the DB file)
     * Recommended for bulk operations.
     * Save using this.saveDataToFile()
     * @param {string} key
     * @param {*} value 
     */
    setLocal(key, value) {
        this.data[key] = value;
    }

    /**
     * Modify a key in the database with a custom callback, using the value of the key as an input to the callback.
     * The callback must return the new value of the key to use.
     * @param {string} key 
     * @param {(value:any) => any} callback 
     */
    update(key, callback) {
        const value = this.get(key);
        const newValue = callback(value);
        this.set(key, newValue);
    }
    /**
     * Modify a key in the database locally with a custom callback, using the value of the key as an input to the callback.
     * The callback must return the new value of the key to use.
     * 
     * Recommended for bulk operations.
     * Save using this.saveDataToFile()
     * @param {string} key 
     * @param {(value:any) => any} callback 
     */
    updateLocal(key, callback) {
        const value = this.get(key);
        const newValue = callback(value);
        this.setLocal(key, newValue);
    }

    /**
     * Delete data for a key from the database.
     * @param {string} key 
     */
    delete(key) {
        delete this.data[key];
        this.saveDataToFile();
    }
    /**
     * Delete data for a key from the database locally (not saved to the DB file)
     * Recommended for bulk operations.
     * Save using this.saveDataToFile()
     * @param {string} key 
     */
    deleteLocal(key) {
        delete this.data[key];
    }

    /**
     * Deletes the entire database.
     */
    deleteAll() {
        this.data = {};
        this.saveDataToFile();
    }
    /**
     * Deletes the entire database locally (not saved to the DB file)
     * Save using this.saveDataToFile()
     */
    deleteAllLocal() {
        this.data = {};
    }

    /**
     * Check if a key exists in the database.
     * @param {string} key 
     */
    has(key) {
        // https://eslint.org/docs/latest/rules/no-prototype-builtins
        return Object.prototype.hasOwnProperty.call(this.data, key);
    }
    /**
     * Get all the data from the database as an array.
     * outputType is an optional parameter that will output the data either as only keys, values, or both.
     * Don't provide the outputType parameter to output both keys and values.
     * 
     * The default output is formatted as [{ key:string, value:any }]
     * @param {"keys"|"values"|null} outputType Determines how the data is output.
     * @returns {Array<string|{key:string, value:any}>}
     */
    array(outputType) {
        switch (outputType) {
            case "keys":
                return Object.keys(this.data);
            case "values":
                return Object.values(this.data);
            default:
                return Object.keys(this.data).map((key) => {
                    return {
                        key,
                        value: this.data[key]
                    }
                });
        }
    }
};

module.exports = Database;