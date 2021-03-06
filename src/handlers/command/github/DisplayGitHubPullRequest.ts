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
    ConfigurableCommandHandler,
    failure,
    HandleCommand,
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    Secret,
    Secrets,
    Tags,
} from "@atomist/automation-client";
import * as _ from "lodash";
import { Lifecycle } from "../../../lifecycle/Lifecycle";
import * as graphql from "../../../typings/types";
import { PullRequestToPullRequestLifecycle } from "../../event/pullrequest/PullRequestToPullRequestLifecycle";
import * as github from "./gitHubApi";

@ConfigurableCommandHandler("Display a pull request on GitHub", {
    intent: [ "show pull request", "show pr", "show github pr", "show github pull request" ],
    autoSubmit: true,
})
@Tags("github", "pr")
export class DisplayGitHubPullRequest implements HandleCommand {

    @Parameter({ description: "PR number", pattern: /^.*$/ })
    public issue: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.SlackChannelName)
    public channelName: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        return ctx.graphClient.query<graphql.PullRequest.Query, graphql.PullRequest.Variables>({
                name: "pullRequest",
                variables: {
                    teamId: ctx.teamId,
                    repoName: this.repo,
                    prName: this.issue,
                    orgOwner: this.owner,
                },
            })
            .then(result => {
                const prs: graphql.PullRequest.PullRequest[] =
                    _.get(result, "ChatTeam[0].team.orgs[0].repo[0].pullRequest");
                const handler = new ResponsePullRequestToPullRequestLifecycle();
                handler.orgToken = this.githubToken;

                // Hopefully we can find the pull request in Neo
                if (prs && prs.length > 0) {
                    return handler.handle({
                        data: { PullRequest: prs as any },
                        extensions: { operationName: "DisplayGitHubPullRequest" },
                    }, ctx);
                }
            })
            .catch(failure);
    }
}

class ResponsePullRequestToPullRequestLifecycle extends PullRequestToPullRequestLifecycle {

    protected processLifecycle(lifecycle: Lifecycle): Lifecycle {
        lifecycle.post = "always";
        return lifecycle;
    }
}
