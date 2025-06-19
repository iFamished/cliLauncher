"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = get;
exports.has = has;
exports.getAll = getAll;
exports.query = query;
exports.set = set;
exports.reset = reset;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const common_1 = require("../utils/common");
const DB_DIR = path_1.default.join((0, common_1.localpath)(), 'database');
const DB_FILE = path_1.default.join(DB_DIR, 'origami.db.json');
(0, common_1.ensureDir)(DB_DIR);
if (!fs_1.default.existsSync(DB_FILE)) {
    fs_1.default.writeFileSync(DB_FILE, JSON.stringify({}, null, 2), 'utf-8');
}
function load() {
    return JSON.parse(fs_1.default.readFileSync(DB_FILE, 'utf-8'));
}
function save(data) {
    fs_1.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
function get(key) {
    const db = load();
    return db[key];
}
function has(key) {
    const db = load();
    return db[key] ? true : false;
}
function getAll() {
    return load();
}
function query(predicate) {
    const db = load();
    return Object.entries(db).filter(predicate);
}
function set(key, value) {
    const db = load();
    db[key] = value;
    save(db);
}
function reset() {
    save({});
}
//# sourceMappingURL=data_manager.js.map