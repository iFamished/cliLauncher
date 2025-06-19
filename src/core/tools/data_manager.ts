import fs from 'fs';
import path from 'path';
import { ensureDir, localpath } from '../utils/common';

const DB_DIR = path.join(localpath(), 'database');
const DB_FILE = path.join(DB_DIR, 'origami.db.json');

ensureDir(DB_DIR);

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

function load(): Record<string, any> {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function save(data: Record<string, any>): void {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function get<T = any>(key: string): T | undefined {
    const db = load();
    return db[key];
}

export function has(key: string): boolean {
    const db = load();
    return db[key] ? true : false;
}

export function getAll(): Record<string, any> {
    return load();
}

export function query<T = any>(predicate: (entry: [string, any]) => boolean): [string, T][] {
    const db = load();
    return Object.entries(db).filter(predicate) as [string, T][];
}

export function set(key: string, value: any): void {
    const db = load();
    db[key] = value;
    save(db);
}

export function reset(): void {
    save({});
}
