import { EventFired } from "@atomist/automation-client/HandleEvent";
import { HandlerContext } from "@atomist/automation-client/HandlerContext";
import { guid } from "@atomist/automation-client/internal/util/string";
import { MessageOptions } from "@atomist/automation-client/spi/message/MessageClient";
import { MessageClientSupport } from "@atomist/automation-client/spi/message/MessageClientSupport";
import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import "mocha";
import * as assert from "power-assert";
import { PushToPushLifecycle } from "../../../../src/handlers/event/push/PushToPushLifecycle";

describe("PushToPushLifecycle", () => {

    /* tslint:disable */
    const payload = `{
    "data": {
        "Push": [{
            "_id": 544370,
            "builds": [],
            "before": {
                "sha": "6118d2b42f65026311ff1f8bc60c40e36e3a0452"
            },
            "after": {
                "sha": "2887cd5b1c9e3d3d725da4dfb024d7e96ed82d92",
                "message": "some commit",
                "statuses": [],
                "tags": []
            },
            "repo": {
                "owner": "some-owner",
                "name": "some-repo",
                "channels": [{
                    "name": "some-channel1"
                  },
                  {
                    "name": "some-channel2"
                  }],
                "labels": [{
                    "name": "accepted"
                }],
                "org": {
                    "provider": null,
                    "chatTeam": {
                        "preferences": [{
                            "name": "branch_configuration",
                            "value": "[{\\"name\\":\\"some-channel1\\",\\"repositories\\":[{\\"owner\\":\\"some-owner\\",\\"name\\":\\"some-repo\\",%%CONFIG%%}]}]"
                          }]
                    }
                },
                "defaultBranch": "master"
            },
            "commits": [{
                "sha": "2887cd5b1c9e3d3d725da4dfb024d7e96ed82d92",
                "message": "some commit",
                "resolves": [],
                "impact": null,
                "apps": [],
                "tags": [],
                "author": {
                    "login": "",
                    "person": null
                },
                "timestamp": "2017-10-17T01:46:12Z"
            }],
            "timestamp": "2017-10-17T01:46:14.409Z",
            "branch": "master"
        }]
    },
    "extensions": {
        "type": "READ_ONLY",
        "operationName": "PushToPushLifecycle",
        "team_id": "T02FL4A1X",
        "team_name": "Cloud Foundry",
        "correlation_id": "c4186758-e47f-4069-bccd-a555380d46cd"
    }
}`;
    /* tslint:enable */

    it("correctly filter pushes on excluded branch", done => {
        class MockMessageClient extends MessageClientSupport {

            protected doSend(msg: string | SlackMessage, userNames: string | string[],
                             channelNames: string | string[], options?: MessageOptions): Promise<any> {
                assert(channelNames.length === 1);
                assert(channelNames[0] === "some-channel2");
                return Promise.resolve();
            }

        }

        const ctx: any = {
            teamId: "T095SFFBK",
            correlationId: "14340b3c-e5bc-4101-9b0a-24cb69fc6bb9",
            invocationId: guid(),
            graphClient: {
                executeQueryFromFile(name: string, variables?: any): Promise<any> {
                    return Promise.resolve();
                },
            },
            messageClient: new MockMessageClient(),
        };
        const handler = new PushToPushLifecycle();
        const config = `\\"exclude\\":\\"^m.*r$\\"`;

        handler.handle(JSON.parse(payload.replace("%%CONFIG%%", config)) as EventFired<any>, ctx as HandlerContext)
            .then(result => {
                assert(result.code === 0);
                done();
            });

    }).timeout(5000);

    it("correctly show pushes on included but also excluded branch", done => {
        class MockMessageClient extends MessageClientSupport {

            protected doSend(msg: string | SlackMessage, userNames: string | string[],
                             channelNames: string | string[], options?: MessageOptions): Promise<any> {
                assert(channelNames.length === 2);
                return Promise.resolve();
            }
        }

        const ctx: any = {
            teamId: "T095SFFBK",
            correlationId: "14340b3c-e5bc-4101-9b0a-24cb69fc6bb9",
            invocationId: guid(),
            graphClient: {
            executeQueryFromFile(name: string, variables?: any): Promise<any> {
                    return Promise.resolve();
                },
            },
            messageClient: new MockMessageClient(),
        };
        const handler = new PushToPushLifecycle();
        const config = `\\"include\\":\\"^m.*r$\\", \\"exclude\\":\\"^m.*r$\\"`;

        handler.handle(JSON.parse(payload.replace("%%CONFIG%%", config)) as EventFired<any>, ctx as HandlerContext)
            .then(result => {
                assert(result.code === 0);
                done();
            });

    }).timeout(5000);

    it("correctly filter pushes that aren't included", done => {
        class MockMessageClient extends MessageClientSupport {

            protected doSend(msg: string | SlackMessage, userNames: string | string[],
                             channelNames: string | string[], options?: MessageOptions): Promise<any> {
                assert(channelNames.length === 1);
                assert(channelNames[0] === "some-channel2");
                return Promise.resolve();
            }
        }

        const ctx: any = {
            teamId: "T095SFFBK",
            correlationId: "14340b3c-e5bc-4101-9b0a-24cb69fc6bb9",
            invocationId: guid(),
            graphClient: {
                executeQueryFromFile(name: string, variables?: any): Promise<any> {
                    return Promise.resolve();
                },
            },
            messageClient: new MockMessageClient(),
        };
        const handler = new PushToPushLifecycle();
        const config = `\\"include\\":\\"^feat-.*$\\"`;

        handler.handle(JSON.parse(payload.replace("%%CONFIG%%", config)) as EventFired<any>, ctx as HandlerContext)
            .then(result => {
                assert(result.code === 0);
                done();
            });

    }).timeout(5000);

    const payloadWithPr = `
    {
    "data": {
        "Push": [{
            "_id": 23016,
            "builds": [],
            "before": {
                "sha": "ba57020ea5e556305204c4e898e9860dfa7d3807"
            },
            "after": {
                "sha": "9298add8d10bb6c9e678e759452c6a220d858d33",
                "message": "Update README.md",
                "statuses": [],
                "tags": []
            },
            "repo": {
                "owner": "atomisthqa",
                "name": "handlers",
                "channels": [ {
                    "name": "handlers"
                }],
                "labels": [{
                    "name": "wontfix"
                }, {
                    "name": "duplicate"
                }, {
                    "name": "enhancement"
                }, {
                    "name": "feature"
                }, {
                    "name": "invalid"
                }, {
                    "name": "label with spaces"
                }, {
                    "name": "question"
                }, {
                    "name": "test"
                }, {
                    "name": "testylabel"
                }, {
                    "name": "UX"
                }, {
                    "name": "help wanted"
                }, {
                    "name": "bug"
                }, {
                    "name": "duplicate"
                }, {
                    "name": "bug"
                }, {
                    "name": "enhancement"
                }, {
                    "name": "wontfix"
                }, {
                    "name": "invalid"
                }, {
                    "name": "help wanted"
                }, {
                    "name": "test"
                }, {
                    "name": "label"
                }, {
                    "name": "label with spaces"
                }, {
                    "name": "question"
                }, {
                    "name": "UX"
                }],
                "org": {
                    "provider": null,
                    "chatTeam": {}
                },
                "defaultBranch": "master"
            },
            "commits": [{
                "sha": "9298add8d10bb6c9e678e759452c6a220d858d33",
                "message": "Update README.md",
                "resolves": [],
                "impact": null,
                "apps": [],
                "tags": [],
                "author": {
                    "login": "cdupuis",
                    "person": {
                        "chatId": {
                            "screenName": "cd"
                        }
                    }
                },
                "timestamp": "2017-10-23T09:40:18Z"
            }],
            "timestamp": "2017-10-23T09:40:20.003Z",
            "branch": "cdupuis-patch-37"
        }]
    },
    "extensions": {
        "type": "READ_ONLY",
        "operationName": "PushToPushLifecycle",
        "team_id": "T1L0VDKJP",
        "team_name": "atomista",
        "correlation_id": "e7e21121-7189-457a-8319-2d33cac5e681"
    }
}
    `;

    it("display referenced PR", done => {
        class MockMessageClient extends MessageClientSupport {

            protected doSend(msg: string | SlackMessage, userNames: string | string[],
                             channelNames: string | string[], options?: MessageOptions): Promise<any> {
                assert(channelNames.length === 1);
                assert(channelNames[0] === "handlers");
                const sm = msg as SlackMessage;
                assert(sm.attachments[1].author_name === "#128: Simplify filter. Add a note");
                return Promise.resolve();
            }
        }

        const ctx: any = {
            teamId: "T095SFFBK",
            correlationId: "14340b3c-e5bc-4101-9b0a-24cb69fc6bb9",
            invocationId: guid(),
            graphClient: {
                executeQueryFromFile(name: string, variables?: any): Promise<any> {
                    assert(variables.branchName === "cdupuis-patch-37");
                    return Promise.resolve({ Repo: [
                        {
                            name: "handlers",
                            branches: [
                                {
                                    name: "cdupuis-patch-37",
                                    pullRequests: [
                                        {
                                            state: "open",
                                            number: 128,
                                            title: "Simplify filter. Add a note",
                                        },
                                    ],
                                },
                            ],
                        },
                    ]});
                },
            },
            messageClient: new MockMessageClient(),
        };
        const handler = new PushToPushLifecycle();

        handler.handle(JSON.parse(payloadWithPr) as EventFired<any>, ctx as HandlerContext)
            .then(result => {
                assert(result.code === 0);
                done();
            });

    }).timeout(5000);

});
