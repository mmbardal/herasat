import {existsSync, readFileSync} from "fs";


function getEnv(key: string): string | undefined {
    if (process.env[`${key}_FILE`] != undefined) {
        if (!existsSync(process.env[`${key}_FILE`]!)) {
            console.error(`'${key}_FILE' was set but no file provided`);
            process.exit(1);
        }

        return readFileSync(process.env[`${key}_FILE`]!).toString();
    } else {
        return process.env[key];
    }
}


export function stringValue(key: string, defaultValue: string | null = null): string {
    const value = getEnv(key);

    if (value != undefined) {
        return value;
    } else if (defaultValue != null) {
        return defaultValue;
    } else {
        console.error(`'${key}' Environment variable is not set`);
        process.exit(1);
    }
}

export function intValue(key: string, defaultValue: number | null = null): number {
    const value = getEnv(key);

    if (value != undefined) {
        return parseInt(value);
    } else if (defaultValue != null) {
        return defaultValue;
    } else {
        console.error(`'${key}' Environment variable is not set`);
        process.exit(1);
    }
}

export function floatValue(key: string, defaultValue: number | null = null): number {
    const value = getEnv(key);

    if (value != undefined) {
        return parseFloat(value);
    } else if (defaultValue != null) {
        return defaultValue;
    } else {
        console.error(`'${key}' Environment variable is not set`);
        process.exit(1);
    }
}

export function boolValue(key: string, defaultValue: boolean | null = null): boolean {
    const value = getEnv(key);

    if (value != undefined) {
        if(value=="true"||value=="false"){
            return value == "true"
        }else {
            console.error(`'${key}' Environment variable is set but value isn't boolean`);
            process.exit(1);
        }
    } else if (defaultValue != null) {
        return defaultValue;
    } else {
        console.error(`'${key}' Environment variable is not set`);
        process.exit(1);
    }
}