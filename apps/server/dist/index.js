"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const PORT = process.env.PORT || 3001;
(0, app_1.createApp)().listen(PORT, () => console.log(`Muzzle server running on ${PORT}`));
