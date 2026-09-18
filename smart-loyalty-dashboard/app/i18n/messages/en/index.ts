import type { Messages } from "../es";
import * as cards from "./cards";
import * as common from "./common";
import * as insights from "./insights";
import * as landing from "./landing";
import * as messaging from "./messaging";
import * as owner from "./owner";
import * as programs from "./programs";

export const en: Messages = { ...cards, ...common, ...insights, ...landing, ...messaging, ...owner, ...programs };
