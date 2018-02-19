import { EventFired } from "@atomist/automation-client/HandleEvent";
import "mocha";
import * as assert from "power-assert";
import {
    FingerprintNodeRenderer,
} from "../../../../../src/handlers/event/push/rendering/PushNodeRenderers";
import * as graphql from "../../../../../src/typings/types";

describe("FingerprintNodeRenderer", () => {

    /* tslint:disable */
    const noFingerprint = `{
	"after": {
		"fingerprints": [],
		"images": [],
		"message": "Update README.md",
		"statuses": [],
		"tags": []
	},
	"branch": "master",
	"builds": [],
	"commits": [{
		"apps": [],
		"author": {
			"login": "claymccoy",
			"person": {
				"chatId": {
					"screenName": "clay"
				}
			}
		},
		"message": "Update README.md",
		"resolves": [],
		"tags": [],
		"timestamp": "2018-02-19T09:41:15-06:00"
	}],
	"repo": {
		"channels": [],
		"defaultBranch": "master",
		"labels": [],
		"name": "GradleBlackDuckTest",
		"org": {
			"provider": {
				"apiUrl": "https://api.github.com/",
				"gitUrl": "git@github.com:",
				"url": "https://github.com/"
			}
		},
		"owner": "atomisthq"
	},
	"timestamp": "2018-02-19T15:41:17.009Z"
}`;
    /* tslint:enable */

    it("should pass through with no fingerprints", () => {
        const push = JSON.parse(noFingerprint) as graphql.PushToPushLifecycle.Push;
        const renderer = new FingerprintNodeRenderer();
        assert(!renderer.supports(push));
    });

    /* tslint:disable */
    const riskProfileFingerprint = `{
	"after": {
		"fingerprints": [{
				"data": "{\\"categories\\":{\\"VULNERABILITY\\":{\\"HIGH\\":1,\\"MEDIUM\\":2,\\"LOW\\":3,\\"OK\\":4}}}",
				"name": "BlackDuckRiskProfile",
				"sha": ""
			}
		]
	}
}`;
    /* tslint:enable */

    it("should render risk profile fingerprint", done => {
        const push = JSON.parse(riskProfileFingerprint) as graphql.PushToPushLifecycle.Push;
        const renderer = new FingerprintNodeRenderer();
        assert(renderer.supports(push));
        renderer.render(push, [], {attachments: []}, undefined).then(msg => {
            const expected = [
                {
                    actions: [],
                    author_icon: "https://images.atomist.com/rug/blackduck.jpg",
                    author_name: "Black Duck",
                    fallback: "Security Risks - 1 High, 2 Medium, 3 Low",
                    mrkdwn_in: [
                        "text",
                    ],
                    text: "Security Risks - 1 High, 2 Medium, 3 Low",
                },
            ];
            assert.deepEqual(msg.attachments, expected);
        })
        .then(done, done);
    });

});
