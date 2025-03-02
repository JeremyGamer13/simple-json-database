# Simple JSON Database

This is a fork of [Easy JSON Database](https://github.com/Androz2091/easy-json-database) which is meant to be used for configuration files or small databases in local apps.
The package is intended to be used in regular code, so unlike the original, you do need to provide valid paths and inputs to functions that expect them.

## Changes
Importing the same file in different areas of your program will use the same instance. This is to prevent desync.
To disable this, add the `forceNew` option when creating a Database.
```js
const db = new Database("./db.json", { forceNew: true });
```

Database files are not indented by default. Add the `indented` option when creating a Database to enable it again.
```js
const db = new Database("./db.json", { indented: true });
```
Snapshots also have a seperate `indented` property:
```js
const db = new Database(path.join(__dirname, "./db.json"), {
    snapshots: {
        indented: true,
        // ...
    }
});
```

Nested properties are not supported. (ex: update `{ "banana": {"count": 1} }` using `db.set("banana.count", 2)`)
This is to allow dots in key names.

Snapshots actually work here. The original [most certainly did not work.](https://github.com/Androz2091/easy-json-database/blob/master/index.js#L86)

All functions that save the database file now have a local alternative.
```js
// Slow for bulk operations:
db.set("abc", 1);
db.set("def", 2);
db.set("ghi", 3);

// Fast for bulk operations:
db.setLocal("abc", 1);
db.setLocal("def", 2);
db.setLocal("ghi", 3);
db.saveDataToFile();
```

The helper functions `add`, `subtract`, and `push` are removed. Use `update` instead.
```js
// Old method:
db.set("count", 5);
db.add("count", 1);

// New method:
db.set("count", 5);
db.update("count", (v) => v + 1);
// This also lets you do something like this:
db.update("count", (v) => (v ?? 0) + 1);
```

The `all` method is now `array`. Don't add the optional `outputType` to output both keys and values.
The output also specifies `data` as `value` instead.

The methods, `fetchDataFromFile`, `saveDataToFile`, and `makeSnapshot` are safe to use in your own code.
Essentially, these are meant to be `public` methods in the class now. This is important since `saveDataToFile` is needed for saving local edits.

Making a snapshot manually via `makeSnapshot` bypasses any of the snapshot settings. If you want to use the method, it's recommended to keep snapshots disabled in the Database settings.

## Module Example

```js
const path = require("path");

const Database = require("simple-json-database");
const db = new Database(path.join(__dirname, "./db.json"), {
    indented: true,
    snapshots: {
        enabled: true,
        path: path.join(__dirname, "./snapshots/"),
        interval: 5000,
        max: 5
    }
});

// Simple stuff
db.set("Hello", "World");
db.get("Hello"); // > World
db.has("Hello"); // > true

// Deleting
db.delete("Hello");
db.has("Hello"); // > false
// Use db.deleteAll() to clear the entire database.

// Helper function: update
// Running this line multiple times will always add 1 to "count", even if it doesn't already exist
db.update("count", (x) => (x || 0) + 1);

// Bulk operations
for (let i = 0; i < 55; i++) {
    // Always use Local versions if you are doing multiple edits to the DB!
    db.setLocal(`item_${i}`, Math.random());
}
// Then, save the local edits to the file:
db.saveDataToFile();

for (let i = 0; i < 20; i++) {
    // We can use our earlier helper function, but locally:
    db.updateLocal("count", (x) => (x || 0) + 1);
}
// Then, save the local edits to the file:
db.saveDataToFile();
```
