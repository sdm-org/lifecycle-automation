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
    CommandHandler,
    failure,
    HandleCommand,
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    Success,
    Tags,
} from "@atomist/automation-client";
import { guid } from "@atomist/automation-client/internal/util/string";
import { QueryNoCacheOptions } from "@atomist/automation-client/spi/graph/GraphClient";
import { buttonForCommand } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import * as _ from "lodash";
import * as graphql from "../../../typings/types";

/**
 * Merge preference for the invoking user.
 */
@CommandHandler("Merge preference for the invoking user", "set preference")
@Tags("preferences", "set")
export class SetUserPreference implements HandleCommand {

    @MappedParameter(MappedParameters.SlackTeam)
    public teamId: string;

    @MappedParameter(MappedParameters.SlackUser)
    public requester: string;

    @Parameter({
        displayName: "Preference Category",
        description: "category of preferences under which you want to set a preference",
        pattern: /^\S+$/,
        validInput: "non-whitespace characters, 1 to 100 characters in length",
        minLength: 1,
        maxLength: 100,
        required: true,
    })
    public key: string;

    @Parameter({
        displayName: "Preference Name",
        description: "key of preference to set",
        pattern: /^\S+$/,
        validInput: "non-whitespace characters, 1 to 100 characters in length",
        minLength: 1,
        maxLength: 100,
        required: true,
    })
    public name: string;

    @Parameter({
        displayName: "Preference Value",
        description: "value to set the preference to, typically stringified JSON but can be just a string",
        pattern: /^[\S\s]*$/,
        validInput: "a string 1000 characters or less",
        minLength: 0,
        maxLength: 1000,
        required: true,
    })
    public value: string;

    @Parameter({
        displayable: false,
        description: "id of the message to use for confirmation",
        pattern: /^\S*$/,
        required: false,
    })
    public id: string;

    @Parameter({
        displayable: false,
        description: "label to show in confirmation message",
        pattern: /^.*$/,
        required: false,
    })
    public label: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        return ctx.graphClient.query<graphql.ChatId.Query, graphql.ChatId.Variables>({
                name: "chatId",
                variables: {
                    teamId: this.teamId,
                    chatId: this.requester,
                },
                options: QueryNoCacheOptions,
            })
            .then(result => {
                const preferences =
                    _.get(result, "ChatTeam[0].members[0].preferences") as graphql.ChatId.Preferences[];
                if (preferences) {
                    const keyPreferences = preferences.find(p => p.name === this.key);
                    if (keyPreferences) {
                        return JSON.parse(keyPreferences.value);
                    }
                }
                return {};
            })
            .then(preferences => {
                let value: any;
                try {
                    value = JSON.parse(this.value);
                } catch (e) {
                    const err = (e as Error).message;
                    console.error(`failed to parse config value '${this.value}' using string: ${err}`);
                    value = this.value;
                }
                preferences[this.name] = value;
                return ctx.graphClient.mutate<graphql.SetChatUserPreference.Mutation,
                        graphql.SetChatUserPreference.Variables>({
                        name: "setChatUserPreference",
                        variables: {
                            teamId: this.teamId,
                            userId: this.requester,
                            name: this.key,
                            value: JSON.stringify(preferences),
                        },
                    });
            })
            .then(() => {
                const msg: SlackMessage = {
                    attachments: [{
                        author_icon: `https://images.atomist.com/rug/check-circle.gif?gif=${guid()}`,
                        author_name: "Successfully updated your preferences",
                        fallback: "Successfully updated your preferences",
                        title: this.label ? this.label : undefined,
                        color: "#45B254",
                        actions: [
                            buttonForCommand({ text: "Configure DMs" }, "ConfigureDirectMessageUserPreferences",
                                { id: this.id }),
                        ],
                    },
                    ],
                };
                return ctx.messageClient.respond(msg, { id: this.id });
            })
            .then(() => Success, err => failure(err));
    }
}
