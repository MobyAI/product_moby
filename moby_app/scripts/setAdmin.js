"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/setAdmin.ts
var dotenv = require("dotenv");
var app_1 = require("firebase-admin/app");
var auth_1 = require("firebase-admin/auth");
// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });
// Same initialization logic as your admin config
var privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
    privateKey = privateKey.replace(/^["']|["']$/g, "");
    if (privateKey.includes("\\n")) {
        privateKey = privateKey.replace(/\\n/g, "\n");
    }
}
var app = (0, app_1.getApps)().length
    ? (0, app_1.getApps)()[0]
    : (0, app_1.initializeApp)({
        credential: (0, app_1.cert)({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
var adminAuth = (0, auth_1.getAuth)(app);
// Get UIDs from environment variable (comma-separated)
var adminUidsString = process.env.NEXT_PUBLIC_ADMIN_UIDS || "";
var uids = adminUidsString
    .split(",")
    .map(function (uid) { return uid.trim(); })
    .filter(function (uid) { return uid.length > 0; });
if (uids.length === 0) {
    console.error("❌ No UIDs found in NEXT_PUBLIC_ADMIN_UIDS environment variable");
    console.log("Make sure .env.local contains: NEXT_PUBLIC_ADMIN_UIDS=uid1,uid2,uid3");
    process.exit(1);
}
function setAdmin(uid) {
    return __awaiter(this, void 0, void 0, function () {
        var user, existingClaims, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, adminAuth.getUser(uid)];
                case 1:
                    user = _a.sent();
                    existingClaims = user.customClaims || {};
                    return [4 /*yield*/, adminAuth.setCustomUserClaims(uid, __assign(__assign({}, existingClaims), { admin: true }))];
                case 2:
                    _a.sent();
                    console.log("\u2705 ".concat(uid, " (").concat(user.email, ") is now an admin!"));
                    return [2 /*return*/, { success: true, uid: uid }];
                case 3:
                    error_1 = _a.sent();
                    console.error("\u274C Error for ".concat(uid, ":"), error_1);
                    return [2 /*return*/, { success: false, uid: uid }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var results, successful, failed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\uD83D\uDE80 Setting ".concat(uids.length, " user(s) as admin...\n"));
                    return [4 /*yield*/, Promise.all(uids.map(setAdmin))];
                case 1:
                    results = _a.sent();
                    successful = results.filter(function (r) { return r.success; }).length;
                    failed = results.filter(function (r) { return !r.success; }).length;
                    console.log("\n\uD83D\uDCCA Successful: ".concat(successful, " | Failed: ").concat(failed));
                    process.exit(failed > 0 ? 1 : 0);
                    return [2 /*return*/];
            }
        });
    });
}
run();
