import type { Messages } from "../es";
import * as cards from "./cards";
import * as common from "./common";
import * as customer from "./customer";
import * as insights from "./insights";
import * as landing from "./landing";
import * as messaging from "./messaging";
import * as owner from "./owner";
import * as pass from "./pass";
import * as programs from "./programs";

export const th: Messages = { ...cards, ...common, ...customer, ...insights, ...landing, ...messaging, ...owner, ...pass, ...programs };
