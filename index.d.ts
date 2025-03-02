declare module 'simple-json-database' {
    interface SnapshotsOptions {
        enabled: boolean;
        path: string;
        interval: number;
    };

    interface DatabaseOptions {
        snapshots?: SnapshotsOptions;
    };

    interface DatabaseElement {
        key: string;
        value: unknown;
    };

    export default class Database {
        constructor (filePath?: string, options?: DatabaseOptions);

        public jsonFilePath: string;
        public options: DatabaseOptions;
        public data: Record<string, unknown>;

        public fetchDataFromFile (): void;
        public saveDataToFile (): void;
        public makeSnapshot (folderPath: string): void;

        public get (key: string): unknown;
        public set (key: string, value: unknown): void;
        public setLocal (key: string, value: unknown): void;

        public update (key: string, callback: (value: unknown) => unknown): void;
        public updateLocal (key: string, callback: (value: unknown) => unknown): void;

        public delete (key: string): void;
        public deleteLocal (key: string): void;
        public deleteAll (): void;
        public deleteAllLocal (): void;
        
        public has (key: string): boolean;
        public array (outputType: "keys" | "values" | null): string|DatabaseElement[];
    }
};