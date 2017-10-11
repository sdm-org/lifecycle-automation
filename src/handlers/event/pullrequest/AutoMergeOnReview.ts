import { Secret } from "@atomist/automation-client/decorators";
import * as GraphQL from "@atomist/automation-client/graph/graphQL";
import {
    EventFired,
    EventHandler,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    Secrets,
    Tags,
} from "@atomist/automation-client/Handlers";
import * as _ from "lodash";
import * as graphql from "../../../typings/types";
import { autoMerge } from "./autoMerge";

@EventHandler("Event handler that auto merges reviewed and approved pull requests on Review events",
    GraphQL.subscriptionFromFile("graphql/subscription/autoMergeOnReview"))
@Tags("lifecycle", "pr", "automerge")
export class AutoMergeOnReview implements HandleEvent<graphql.AutoMergeOnReview.Subscription> {

    @Secret(Secrets.OrgToken)
    public githubToken: string;

    public handle(root: EventFired<graphql.AutoMergeOnReview.Subscription>,
                  ctx: HandlerContext): Promise<HandlerResult> {
        const pr = _.get(root, "data.Review[0].pullRequest");
        return autoMerge(pr);
    }
}
