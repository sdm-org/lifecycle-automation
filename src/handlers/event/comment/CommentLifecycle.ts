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

import { EventFired, HandlerContext } from "@atomist/automation-client";
import { SlackMessage } from "@atomist/slack-messages";
import {
    CardMessage,
    newCardMessage,
} from "../../../lifecycle/card";
import {
    CardActionContributorWrapper,
    Lifecycle,
    LifecycleHandler,
} from "../../../lifecycle/Lifecycle";
import { AttachImagesNodeRenderer } from "../../../lifecycle/rendering/AttachImagesNodeRenderer";
import { CollaboratorCardNodeRenderer } from "../../../lifecycle/rendering/CollaboratorCardNodeRenderer";
import { FooterNodeRenderer } from "../../../lifecycle/rendering/FooterNodeRenderer";
import { ReferencedIssuesNodeRenderer } from "../../../lifecycle/rendering/ReferencedIssuesNodeRenderer";
import * as graphql from "../../../typings/types";
import { LifecyclePreferences } from "../preferences";
import {
    AssignActionContributor,
    CloseActionContributor,
    CommentActionContributor,
    DetailsActionContributor,
    LabelActionContributor,
    ReactionActionContributor,
} from "./rendering/CommentActionContributors";
import { IssueCommentCardNodeRenderer, PullRequestCommentCardNodeRenderer } from "./rendering/CommentCardNodeRenderers";
import {
    IssueCommentNodeRenderer,
    PullRequestCommentNodeRenderer,
} from "./rendering/CommentNodeRenderers";

export abstract class CommentLifecycleHandler<R> extends LifecycleHandler<R> {

    protected prepareMessage(): Promise<SlackMessage> {
        return Promise.resolve({
            text: null,
            attachments: [],
        });
    }

    protected prepareLifecycle(event: EventFired<R>): Lifecycle[] {
        const [comments, issue, pullRequest, repo, updateOnly] = this.extractNodes(event);

        if (comments != null) {
            return comments.map(comment => {
                const nodes = [];

                if (repo != null) {
                    nodes.push(repo);
                }

                if (issue != null) {
                    nodes.push(issue);
                }

                if (pullRequest != null) {
                    nodes.push(pullRequest);
                }

                nodes.push(comment);

                // Verify that there is at least a comment and repo node
                if (comment == null || repo == null) {
                    console.debug(`Lifecycle event is missing comment and/or repo node`);
                    return null;
                }

                const id = issue != null ? issue.number : pullRequest.number;

                const configuration: Lifecycle = {
                    name: LifecyclePreferences.comment.id,
                    nodes,
                    renderers: [
                        new IssueCommentNodeRenderer(),
                        new PullRequestCommentNodeRenderer(),
                        new ReferencedIssuesNodeRenderer(),
                        new AttachImagesNodeRenderer(node => {
                            if (node.issue) {
                                return node.issue.state === "open";
                            } else if (node.pullRequest) {
                                return node.pullRequest.state === "open";
                            } else {
                                return false;
                            }
                        }),
                        new FooterNodeRenderer(node => node.body && (node.issue || node.pullRequest))],
                    contributors: [
                        new AssignActionContributor(),
                        new CommentActionContributor(),
                        new LabelActionContributor(),
                        new ReactionActionContributor(),
                        new CloseActionContributor(),
                        new DetailsActionContributor(),
                    ],
                    id: `comment_lifecycle/${repo.owner}/${repo.name}/${id}/${comment.gitHubId}`,
                    timestamp: Date.now().toString(),
                    post: updateOnly ? "update_only" : undefined,
                    channels: repo.channels.map(c => ({ name: c.name, teamId: c.team.id })),
                    extract: (type: string) => {
                        if (type === "repo") {
                            return repo;
                        } else if (type === "issue") {
                            return issue;
                        } else if (type === "pullrequest") {
                            return pullRequest;
                        }
                        return null;
                    },
                };
                return configuration;
            });
        }
    }

    protected abstract extractNodes(event: EventFired<R>):
        [graphql.IssueToIssueCommentLifecycle.Comments[],
            graphql.IssueToIssueCommentLifecycle.Issue,
            graphql.PullRequestToPullRequestCommentLifecycle.PullRequest,
            graphql.IssueToIssueCommentLifecycle.Repo,
            boolean];
}
