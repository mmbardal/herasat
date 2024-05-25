import {boolValue, intValue, stringValue, floatValue} from "./env";


export const releaseMode: boolean = false;//boolValue("RELEASEMODE");

export const apiPrefix: string = "api/v2";

export const apiPort: number = 8081;

export const logPrint: boolean = true;


//expire of token in seconds
export const tokenExpire: number = 86400;

//expire of password in seconds
export const passwordExpire: number = 120;

export const sessionExpire: number = 86400;

// S3 bucket
export const photoBucket: string = "photo-paziresh";

//Queue Setting
//export const concurrency: number = releaseMode ? intValue("CONCURRENCY") : 30;

//MySQL configs
export const mysqlHost: string = releaseMode ? stringValue("MYSQL_HOST") : "192.168.101.69";
export const mysqlUser: string = releaseMode ? stringValue("MYSQL_USER") : "mostafa";
export const mysqlPass: string = releaseMode ? stringValue("MYSQL_PASS") : "2003";
export const mysqlDatabase = "herasat";
export const mysqlPort: number = 3306;

//Redis configs
export const redisHost: string = releaseMode ? stringValue("REDIS_HOST") : "192.168.101.92";
export const redisPort: number = 6379;

export const redisDb: number = 7;

//Minio configs
export const minioHost: string = releaseMode ? stringValue("MINIO_HOST") : "192.168.101.92";
export const minioUser: string = releaseMode ? stringValue("MINIO_USER") : "minio";
export const minioPass: string = releaseMode ? stringValue("MINIO_PASS") : "123456789";

export const minioPort: number = 9003;


export const dateRegex:string =`^1[34][0-9][0-9]\/(0?[1-9]|1[012])\/(0?[1-9]|[12][0-9]|3[01])$`
export const nationalCodeRegex:string = `^\d{10}$`;
export const phoneNumberRegex:string = `^09\d{9}$`;
export const homeNumberRegex:string = `^0\d{10}$`;
export const numbers:string = `^[0-9]+$`;