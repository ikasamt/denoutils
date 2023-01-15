import { Client, ExecuteResult } from "https://deno.land/x/mysql/mod.ts";
import { pluralize } from "https://deno.land/x/inflector/mod.ts";
import * as Colors from "https://deno.land/std/fmt/colors.ts";
import { MemoizeExpiring } from "https://github.com/darrylhodgins/typescript-memoize/raw/master/src/memoize-decorator.ts";

import _ from "npm:lodash";
import SqlString from "npm:sqlstring";

console.info = function (...data: any[]) {
  console.log(
    Colors.green("[INFO]"),
    Colors.blue(`[${new Date().toLocaleString()}]`),
    ...data
  );
};

console.error = function (...data: any[]) {
  console.log(
    Colors.red("[ERROR]"),
    Colors.blue(`[${new Date().toLocaleString()}]`),
    ...data
  );
};

function sqlEscape(str: string): string {
  const k = SqlString.escape(str);
  return k.slice(1, k.length - 1);
}

export type FindOptions = {
  conditions?: { [key: string]: any } | [string, any];
  select?: string[];
  order?: string;
  limit?: number;
  offset?: number;
};

class Change {
  public key: string;
  public before;
  public after;
  constructor(key: string, before: any, after: any) {
    this.key = key;
    this.before = before;
    this.after = after;
  }
}

const MysqlClient = new Client();

export class ActiveRecord {
  // stub
  id: undefined | number;
  created_at: undefined | Date;
  updated_at: undefined | Date;

  // methods
  public _before: { [key: string]: any };

  constructor() {
    this._before = {};
  }

  static async load(data: { [key: string]: any }): Promise<ActiveRecord> {
    const fields_ = await this.fields();
    const record = new this();
    for (const key in data) {
      switch (fields_[key].Type) {
        case "json":
          record[key] = JSON.parse(data[key]);
          break;
        default:
          record[key] = data[key];
          break;
      }
    }
    // record._before = JSON.parse(JSON.stringify(record));
    record._before = _.cloneDeep(record);
    delete record._before["_before"];
    return record;
  }

  changed() {
    const tmp: Change[] = [];

    for (const key in this) {
      if (!key.startsWith("_")) {
        tmp.push(new Change(key, this._before[key], this[key]));
      }
    }

    for (const key2 in this._before) {
      tmp.push(new Change(key2, this._before[key2], this[key2 as keyof this]));
    }

    let result = {};
    for (const change of tmp) {
      if (!_.isEqual(change.before, change.after)) {
        result[change.key] = change;
      }
    }
    return result;
  }

  async before_save() {}
  async after_save() {}

  async _save() {
    const fields_ = await this.constructor.fields();

    if (this.id === undefined) {
      this["created_at"] = new Date();
    }
    this["updated_at"] = new Date();

    const keys = [];
    const values = [];
    for (const key in this) {
      if (!key.startsWith("_")) {
        if (this[key] === undefined) {
          continue;
        }

        if (fields_[key] === undefined) {
          continue;
        }

        keys.push(key);
        let v = this[key];
        if (fields_[key].Type === "json") {
          v = JSON.stringify(this[key]);
        }
        values.push(v);
      }
    }

    const client = await this.constructor.getConnection();

    let sql = "";
    if (this.id === undefined) {
      // insert
      sql = `INSERT INTO ${this.constructor.table_name()}  `;
      sql += `(${keys.join(",")}) VALUES `;
      sql += `(${keys.map((k) => "?").join(",")})`;
      const result = await client.query(sql, values);
      console.info(result);
      this.id = result.insertId;
    } else {
      // update
      sql = `UPDATE ${this.constructor.table_name()} SET `;
      sql += keys.map((k) => `${k} = ?`).join(",");
      sql += ` WHERE id = ${SqlString.escape(this.id)}`;
      const result = await client.query(sql, values);
      console.info(result);
    }

    await client.close();
  }

  async save() {
    await this.before_save();
    await this._save();
    await this.after_save();
  }

  // static

  public static connectionParam = {};

  static async getConnection(): Promise<Client> {
    // const MysqlClient = new Client();
    return await MysqlClient.connect(this.connectionParam);
  }

  @MemoizeExpiring(5000)
  static table_name() {
    return pluralize(this.class_name()).toLowerCase();
  }

  @MemoizeExpiring(5000)
  static async fields() {
    const client = await this.getConnection();
    const result = await client.query(`DESCRIBE ${this.table_name()}`);
    await client.close();
    const _fields = {};
    for (const v of result) {
      _fields[v.Field] = v;
    }
    return _fields;
  }

  static async execute(
    sql: string,
    params?: any[] | undefined
  ): Promise<ExecuteResult> {
    const startTime = performance.now(); // 開始時間
    const client = await this.getConnection();
    const result = await client.execute(sql, params);
    await client.close();
    const endTime = performance.now(); // 終了時間
    console.info(
      `[TIME] ${endTime - startTime}ms`,
      `[SQL] ${Colors.cyan(sql)}`,
      `[ARGS] ${params}`
    );
    return result;
  }

  static async find_by_sql(sql: string, args: any[] = []): Promise<any[]> {
    const result = await this.execute(sql, args);
    if (result.rows === undefined) {
      return [];
    }

    return await Promise.all(
      result.rows!.map(async (row) => {
        return await this.load(row);
      })
    );
  }

  static class_name() {
    return this.name;
  }

  static async find_one(options: FindOptions): Promise<ActiveRecord | null> {
    const instances = await this.find_all({
      conditions: options.conditions,
      limit: 1,
      offset: 0,
      order: options.order,
      select: options.select,
    });
    if (instances.length == 0) {
      return null;
    }
    return instances[0];
  }

  static async first(options: FindOptions): Promise<ActiveRecord | null> {
    return await this.find_one({
      conditions: options.conditions,
      order: "id desc",
      select: options.select,
    });
  }

  static async last(options: FindOptions): Promise<ActiveRecord | null> {
    return await this.find_one({
      conditions: options.conditions,
      order: "id asc",
      select: options.select,
    });
  }

  static async find_all(options: FindOptions): Promise<ActiveRecord[]> {
    const args: any[] = [];
    let sql = "SELECT ";
    if (options.select) {
      sql += ` ${options.select
        .map((v: string) => {
          return sqlEscape(v);
        })
        .join(",")} `;
    } else {
      sql += " * ";
    }

    sql += `FROM ${this.table_name()} `;

    if (options.conditions) {
      if (options.conditions instanceof Array) {
        if (options.conditions.length > 1) {
          if (options.conditions[1] instanceof Array) {
            for (const c of options.conditions[1]) {
              args.push(c);
            }
          } else {
            args.push(options.conditions[1]);
          }
        }
        sql += `WHERE ${options.conditions[0]} `;
      } else {
        const where_pairs = [];
        for (const key in options.conditions) {
          where_pairs.push(`${sqlEscape(key)} = ? `);
          args.push(options.conditions[key]);
        }
        sql += `WHERE ${where_pairs.join(" AND ")} `;
      }
    }

    if (options.order) {
      sql += `ORDER BY ${SqlString.escape(options.order)} `;
    }

    if (options.limit) {
      sql += `LIMIT ${SqlString.escape(options.limit)} `;
      if (options.offset) {
        sql += `OFFSET ${SqlString.escape(options.offset)} `;
      }
    }

    const rows = await this.find_by_sql(sql, args);
    return rows;
  }
}
