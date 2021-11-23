import { app, dialog, ipcMain, nativeTheme, systemPreferences } from "electron";

import { Server } from "@server/index";
import { FileSystem } from "@server/fileSystem";
import { AlertService } from "@server/services/alertService";
import { openLogs } from "@server/api/v1/apple/scripts";
import { fixServerUrl } from "@server/helpers/utils";
import { BlueBubblesHelperService } from "../privateApi";

export class IPCService {
    /**
     * Starts the inter-process-communication handlers. Basically, a router
     * for all requests sent by the Electron front-end
     */
    static startIpcListener() {
        ipcMain.handle("get-message-count", async (event, args) => {
            if (!Server().iMessageRepo?.db) return 0;
            const count = await Server().iMessageRepo.getMessageCount(args?.after, args?.before, args?.isFromMe);
            return count;
        });

        ipcMain.handle("get-chat-image-count", async (event, args) => {
            if (!Server().iMessageRepo?.db) return 0;
            const count = await Server().iMessageRepo.getMediaCountsByChat({ mediaType: "image" });
            return count;
        });

        ipcMain.handle("get-chat-video-count", async (event, args) => {
            if (!Server().iMessageRepo?.db) return 0;
            const count = await Server().iMessageRepo.getMediaCountsByChat({ mediaType: "video" });
            return count;
        });

        ipcMain.handle("get-group-message-counts", async (event, args) => {
            if (!Server().iMessageRepo?.db) return 0;
            const count = await Server().iMessageRepo.getChatMessageCounts("group");
            return count;
        });

        ipcMain.handle("get-individual-message-counts", async (event, args) => {
            if (!Server().iMessageRepo?.db) return 0;
            const count = await Server().iMessageRepo.getChatMessageCounts("individual");
            return count;
        });

        ipcMain.handle("get-devices", async (event, args) => {
            // eslint-disable-next-line no-return-await
            return await Server().repo.devices().find();
        });

        ipcMain.handle("get-fcm-server", (event, args) => {
            return FileSystem.getFCMServer();
        });

        ipcMain.handle("get-fcm-client", (event, args) => {
            return FileSystem.getFCMClient();
        });
    }

    /**
     * Starts configuration related inter-process-communication handlers.
     */
    static startConfigIpcListeners() {
        ipcMain.handle("set-config", async (_, args) => {
            // Make sure that the server address being sent is using https
            if (args.server_address) {
                // eslint-disable-next-line no-param-reassign
                args.server_address = fixServerUrl(args.server_address);
            }

            for (const item of Object.keys(args)) {
                if (Server().repo.hasConfig(item) && Server().repo.getConfig(item) !== args[item]) {
                    Server().repo.setConfig(item, args[item]);
                }
            }

            return Server().repo?.config;
        });

        ipcMain.handle("get-config", async (_, __) => {
            if (!Server().repo.db) return {};
            return Server().repo?.config;
        });

        ipcMain.handle("get-alerts", async (_, __) => {
            const alerts = await AlertService.find();
            return alerts;
        });

        ipcMain.handle("mark-alert-as-read", async (_, args) => {
            const alertIds = args ?? [];
            // for (const id of alertIds) {
            //     await AlertService.markAsRead(id);
            // }
            await AlertService.markAsRead(args);

            Server().notificationCount = 0;
            app.setBadgeCount(Server().notificationCount);
        });

        ipcMain.handle("set-fcm-server", async (_, args) => {
            FileSystem.saveFCMServer(args);
        });

        ipcMain.handle("set-fcm-client", async (_, args) => {
            FileSystem.saveFCMClient(args);
            await Server().fcm.start();
        });

        ipcMain.handle("toggle-tutorial", async (_, toggle) => {
            await Server().repo.setConfig("tutorial_is_done", toggle);

            if (toggle) {
                await Server().setupServices();
                await Server().startServices();
            }
        });

        ipcMain.handle("check_perms", async (_, __) => {
            return {
                abPerms: systemPreferences.isTrustedAccessibilityClient(false) ? "authorized" : "denied",
                fdPerms: Server().iMessageRepo?.db ? "authorized" : "denied"
            };
        });

        ipcMain.handle("prompt_accessibility", async (_, __) => {
            return {
                abPerms: systemPreferences.isTrustedAccessibilityClient(true) ? "authorized" : "denied"
            };
        });

        ipcMain.handle("prompt_disk_access", async (_, __) => {
            return {
                fdPerms: "authorized"
            };
        });

        ipcMain.handle("toggle-caffeinate", async (_, toggle) => {
            if (Server().caffeinate && toggle) {
                Server().caffeinate.start();
            } else if (Server().caffeinate && !toggle) {
                Server().caffeinate.stop();
            }

            await Server().repo.setConfig("auto_caffeinate", toggle);
        });

        ipcMain.handle("set-ngrok-key", async (_, data) => {
            await Server().stopProxyServices();
            await Server().repo.setConfig("ngrok_key", data.key);
            await Server().restartProxyServices();
        });

        ipcMain.handle("toggle-proxy-service", async (_, data) => {
            await Server().stopProxyServices();
            await Server().repo.setConfig("proxy_service", data.service);

            if (data.service === "Dynamic DNS") {
                await Server().repo.setConfig("server_address", "Dynamic DNS Enabled...");
            }

            await Server().restartProxyServices();
        });

        ipcMain.handle("toggle-ngrok-protocol", async (_, data) => {
            await Server().stopProxyServices();
            await Server().repo.setConfig("ngrok_protocol", data.protocol);
            await Server().restartProxyServices();
        });

        ipcMain.handle("toggle-ngrok-region", async (_, data) => {
            await Server().stopProxyServices();
            await Server().repo.setConfig("ngrok_region", data.region);
            await Server().restartProxyServices();
        });

        ipcMain.handle("toggle-private-api", async (_, toggle) => {
            await Server().repo.setConfig("enable_private_api", toggle);
            if (Server().privateApiHelper === null) {
                Server().privateApiHelper = new BlueBubblesHelperService();
            }

            if (toggle) {
                Server().privateApiHelper.start();
            } else {
                Server().privateApiHelper.stop();
            }
        });

        ipcMain.handle("get-caffeinate-status", (_, __) => {
            return {
                isCaffeinated: Server().caffeinate.isCaffeinated,
                autoCaffeinate: Server().repo.getConfig("auto_caffeinate")
            };
        });

        ipcMain.handle("purge-event-cache", (_, __) => {
            if (Server().eventCache.size() === 0) {
                Server().log("No events to purge from event cache!");
            } else {
                Server().log(`Purging ${Server().eventCache.size()} items from the event cache!`);
                Server().eventCache.purge();
            }
        });

        ipcMain.handle("purge-devices", (_, __) => {
            Server().repo.devices().clear();
        });

        ipcMain.handle("restart-via-terminal", (_, __) => {
            Server().restartViaTerminal();
        });

        ipcMain.handle("toggle-auto-start", async (_, toggle) => {
            await Server().repo.setConfig("auto_start", toggle);
            app.setLoginItemSettings({ openAtLogin: toggle, openAsHidden: true });
        });

        ipcMain.handle("restart-server", async (_, __) => {
            await Server().hotRestart();
        });

        ipcMain.handle("get-current-theme", (_, __) => {
            if (nativeTheme.shouldUseDarkColors === true) {
                return {
                    currentTheme: "dark"
                };
            }
            return {
                currentTheme: "light"
            };
        });

        ipcMain.handle("show-dialog", (_, opts: Electron.MessageBoxOptions) => {
            return dialog.showMessageBox(Server().window, opts);
        });

        ipcMain.handle("open-log-location", (_, __) => {
            FileSystem.executeAppleScript(openLogs());
        });

        ipcMain.handle("clear-alerts", async (_, __) => {
            app.setBadgeCount(0);
            await Server().repo.alerts().clear();
        });
    }
}
