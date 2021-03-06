/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    failure,
    HandleCommand,
    HandlerContext,
    HandlerResult,
    Parameter,
    Parameters,
    Success,
} from "@atomist/automation-client";
import { commandHandlerFrom } from "@atomist/automation-client/onCommand";
import { success } from "../../../util/messages";

@Parameters()
export class CancelParameters {

    @Parameter({ description: "message id", required: false, displayable: false })
    public msgId: string;

    @Parameter({ description: "title", required: false, displayable: false })
    public title: string;

    @Parameter({ description: "text", required: false, displayable: false })
    public text: string;
}

export function cancelMessage() {
    return async (ctx: HandlerContext, params: CancelParameters): Promise<HandlerResult> => {
            return ctx.messageClient.respond(success(params.title, params.text), { id: params.msgId })
                .then(() => Success, failure);
        };
}

export function cancelConversation(): HandleCommand<CancelParameters> {
    return commandHandlerFrom(
        cancelMessage(),
        CancelParameters,
        "cancelConversation",
        "Cancel an ongoing conversation",
        [],
    );
}
