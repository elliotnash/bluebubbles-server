import { Server } from "@server/index";
import { ValueTransformer } from "typeorm";

export const AttributedBodyTransformer: ValueTransformer = {
    from: dbValue => Server().swiftHelper.deserializeAttributedBody(dbValue),
    to: null
};
