import type { Messages } from "../es";
import * as cards from "./cards";
import * as common from "./common";
import * as customer from "./customer";
import * as insights from "./insights";
import * as landing from "./landing";
import * as legal from "./legal";
import * as messaging from "./messaging";
import * as owner from "./owner";
import * as pass from "./pass";
import * as programs from "./programs";

export const en: Messages = { ...cards, ...common, ...customer, ...insights, ...landing, ...legal, ...messaging, ...owner, ...pass, ...programs };
