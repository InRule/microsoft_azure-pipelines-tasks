import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
const fs = require('fs');
var cpExec = require('child_process').execSync;

let taskPath = path.join(__dirname, '..', 'main.js');
let tr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tr.setInput("action", "Create Or Update Resource Group");
tr.setInput("ConnectedServiceName", "AzureRM");
tr.setInput("resourceGroupName", "dummy");
tr.setInput("location", "West US");
tr.setInput("templateLocation", "Linked artifact")
tr.setInput("csmFile", process.env["csmFile"]);
tr.setInput("overrideParameters", "");
tr.setInput("deploymentMode", "What-If");
tr.setInput("enableDeploymentPrerequisites", "None");
tr.setInput("csmParametersFile", process.env["csmParametersFile"]);
tr.setInput("deploymentOutputs", !!process.env["deploymentOutputs"] ? process.env["deploymentOutputs"] : "");

process.env["ENDPOINT_AUTH_AzureRM"] = "{\"parameters\":{\"serviceprincipalid\":\"id\",\"serviceprincipalkey\":\"key\",\"tenantid\":\"tenant\"},\"scheme\":\"ServicePrincipal\"}";
process.env["ENDPOINT_AUTH_PARAMETER_AzureRM_SERVICEPRINCIPALID"] = "id";
process.env["ENDPOINT_AUTH_PARAMETER_AzureRM_SERVICEPRINCIPALKEY"] = "key";
process.env["ENDPOINT_AUTH_PARAMETER_AzureRM_TENANTID"] = "tenant";
process.env["ENDPOINT_DATA_AzureRM_SUBSCRIPTIONID"] = "sId";
process.env["ENDPOINT_DATA_AzureRM_SUBSCRIPTIONNAME"] = "sName";
process.env["ENDPOINT_URL_AzureRM"] = "https://management.azure.com/";
process.env["ENDPOINT_DATA_AzureRM_ENVIRONMENTAUTHORITYURL"] = "https://login.windows.net/";
process.env["ENDPOINT_DATA_AzureRM_ACTIVEDIRECTORYSERVICEENDPOINTRESOURCEID"] = "https://management.azure.com";
process.env["ENDPOINT_DATA_AzureRM_GRAPHURL"] = "https://graph.windows.net/";
process.env["ENDPOINT_DATA_AzureRM_ENVIRONMENTURL"] = "https://management.azure.com/";

tr.registerMock('azure-pipelines-tasks-azure-arm-rest/azure-arm-resource', {
    ResourceManagementClient: function (A, B, C) {
        return {
            resourceGroup: {
                checkExistence: function (callback) {
                    callback(null, true);
                }
            },
            deployments: {
                validate: function (deploymentName, params, options, callback) {
                    callback(null, {});
                },
                whatIf: function (deploymentName, params, options, callback) {
                    // Mock what-if response - successful case with changes
                    const whatIfResult = {
                        properties: {
                            changes: [
                                {
                                    resourceId: "/subscriptions/sId/resourceGroups/dummy/providers/Microsoft.Storage/storageAccounts/teststorage",
                                    changeType: "Create",
                                    before: null,
                                    after: { 
                                        sku: { name: "Standard_LRS" }, 
                                        kind: "StorageV2",
                                        properties: {
                                            accessTier: "Hot"
                                        }
                                    }
                                },
                                {
                                    resourceId: "/subscriptions/sId/resourceGroups/dummy/providers/Microsoft.Web/sites/testwebapp",
                                    changeType: "Modify",
                                    before: { 
                                        properties: {
                                            siteConfig: {
                                                appSettings: []
                                            }
                                        }
                                    },
                                    after: { 
                                        properties: {
                                            siteConfig: {
                                                appSettings: [
                                                    { name: "ENVIRONMENT", value: "production" }
                                                ]
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    };
                    console.log("deployments.whatIf is called");
                    callback(null, whatIfResult);
                }
            }
        }
    }
});

tr.registerMock('azure-pipelines-tasks-azure-arm-rest/azure-arm-subscription', {
    SubscriptionManagementClient: function (A, B, C) {
        return {
            deployments: {
                validate: function (deploymentName, params, options, callback) {
                    callback(null, {});
                },
                whatIf: function (deploymentName, params, options, callback) {
                    // Mock what-if response
                    const whatIfResult = {
                        properties: {
                            changes: []
                        }
                    };
                    callback(null, whatIfResult);
                }
            }
        }
    }
});

tr.registerMock('azure-pipelines-tasks-azure-arm-rest/azure-arm-management-group', {
    ManagementGroupManagementClient: function (A, B, C) {
        return {
            deployments: {
                validate: function (deploymentName, params, options, callback) {
                    callback(null, {});
                },
                whatIf: function (deploymentName, params, options, callback) {
                    // Mock what-if response
                    const whatIfResult = {
                        properties: {
                            changes: []
                        }
                    };
                    callback(null, whatIfResult);
                }
            }
        }
    }
});

tr.registerMock('azure-pipelines-tasks-azure-arm-rest/azure-graph', {
    GraphManagementClient: function (A, B, C) {
        return {
            servicePrincipals: {
                get: function (options, callback) {
                    callback(null, {displayName: "testSPN"});
                }
            }
        }
    }
});

let answers = <ma.TaskLibAnswers>{
    "which": {
        "az": "/usr/bin/az"
    },
    "exec": {
        "/usr/bin/az --version": {
            "code": 0,
            "stdout": JSON.stringify({
                "azure-cli": "2.21.0",
                "azure-cli-core": "2.21.0"
            })
        }
    },
    "checkPath": {
        "/usr/bin/az": true
    }
};

tr.setAnswers(answers);

tr.run();