import {Pool} from "mysql2/promise";

import mysql from 'mysql2/promise';

import {mysqlDatabase, mysqlHost, mysqlPass, mysqlPort, mysqlUser} from "./constatnts";

import assert from "node:assert";

export class DB {
    private static pool: Pool | null = null;

    static get conn():Pool {
        assert(this.pool!=null,"use DB.init first");
        return this.pool!;
    }
    static init(maxCon: number = 3): Pool {
        this.pool ??= mysql.createPool({
            host: mysqlHost,
            port: mysqlPort,
            user: mysqlUser,
            password: mysqlPass,
            connectionLimit: maxCon,
            database: mysqlDatabase,
        });

        return this.pool;

    }
}