import { RouterContext } from "koa-router";
import { Next } from "koa";
import type { File } from "formidable";
import { Server } from "@server/index";
import { isEmpty } from "@server/helpers/utils";
import { MessageInterface } from "@server/api/v1/interfaces/messageInterface";

import { ValidateInput } from "./index";
import { BadRequest } from "../responses/errors";

export class MessageValidator {
    static findParamRules = {
        guid: "required|string"
    };

    static async validateFind(ctx: RouterContext, next: Next) {
        ValidateInput(ctx.params, MessageValidator.findParamRules);
        await next();
    }

    static queryBodyRules = {
        with: "array|in:chat,chats,attachment,attachments,handle,chat.participants,chats.participants",
        where: "array",
        "where.*.statement": "required|string",
        "where.*.args": "present",
        sort: "string|in:ASC,DESC",
        after: "numeric|min:0",
        before: "numeric|min:1",
        chatGuid: "string",
        offset: "numeric|min:0",
        limit: "numeric|min:1|max:1000"
    };

    static async validateQuery(ctx: RouterContext, next: Next) {
        ValidateInput(ctx?.request?.body, MessageValidator.queryBodyRules);
        await next();
    }

    static sendTextRules = {
        chatGuid: "required|string",
        tempGuid: "string",
        message: "present|string",
        method: "string|in:apple-script,private-api",
        effectId: "string",
        subject: "string",
        selectedMessageGuid: "string"
    };

    static async validateText(ctx: RouterContext, next: Next) {
        const { tempGuid, method, effectId, subject, selectedMessageGuid } = ValidateInput(
            ctx.request.body,
            MessageValidator.sendTextRules
        );
        let saniMethod = method;

        // Default the method to AppleScript
        saniMethod = saniMethod ?? "apple-script";

        // If we have an effectId, subject, reply, or attributedBody
        // let's imply we want to use the Private API
        if (effectId || subject || selectedMessageGuid || ctx.request.body.attributedBody) {
            saniMethod = "private-api";
        }

        // If we are sending via apple-script, we require a tempGuid
        if (saniMethod === "apple-script" && isEmpty(tempGuid)) {
            throw new BadRequest({ error: `A 'tempGuid' is required when sending via AppleScript` });
        }

        // Inject the method (we have to force it to thing it's anything)
        (ctx.request.body as any).method = saniMethod;

        // Make sure the message isn't already in the queue
        if (Server().httpService.sendCache.find(tempGuid)) {
            throw new BadRequest({ error: `Message is already queued to be sent! (Temp GUID: ${tempGuid})` });
        }

        await next();
    }

    static sendAttachmentRules = {
        chatGuid: "required|string",
        tempGuid: "required|string",
        name: "required|string"
    };

    static async validateAttachment(ctx: RouterContext, next: Next) {
        const { files } = ctx.request;
        const { tempGuid } = ValidateInput(ctx.request?.body, MessageValidator.sendAttachmentRules);

        // Make sure the message isn't already in the queue
        if (Server().httpService.sendCache.find(tempGuid)) {
            throw new BadRequest({ error: "Attachment is already queued to be sent!" });
        }

        // Make sure the message isn't already in the queue
        const attachment = files?.attachment as File;
        if (!attachment || attachment.size === 0) {
            throw new BadRequest({ error: "Attachment not provided or was empty!" });
        }

        await next();
    }

    static sendReactionRules = {
        chatGuid: "required|string",
        selectedMessageGuid: "required|string",
        reaction: `required|string|in:${MessageInterface.possibleReactions.join(",")}`
    };

    static async validateReaction(ctx: RouterContext, next: Next) {
        ValidateInput(ctx.request?.body, MessageValidator.sendReactionRules);
        await next();
    }
}
