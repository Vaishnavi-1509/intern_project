require('dotenv-flow').config();
const express = require('express');
const cors = require('cors');
const { CloudAdapter, ConfigurationServiceClientCredentialFactory, createBotFrameworkAuthenticationFromConfiguration } = require('botbuilder');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

console.log('✅ Loading Environment Variables...');
console.log('App ID:', process.env.MicrosoftAppId);
console.log('App Password:', process.env.MicrosoftAppPassword);

// Setup credentials
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: process.env.MicrosoftAppId,
    MicrosoftAppPassword: process.env.MicrosoftAppPassword,
    MicrosoftAppType: process.env.MicrosoftAppType || 'MultiTenant',
    MicrosoftAppTenantId: process.env.MicrosoftAppTenantId || 'common',
});

// Create Bot Framework Authentication
const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);

// Create Cloud Adapter
console.log('✅ Creating Cloud Adapter...');
const adapter = new CloudAdapter(botFrameworkAuthentication);
console.log('✅ Cloud Adapter Created.');

// Error handler
adapter.onTurnError = async (context, error) => {
    console.error(`\n [onTurnError]: ${error}`);
    await context.sendActivity('Oops. Something went wrong!');
};

// Listen for incoming requests
app.post('/api/messages', async (req, res) => {
    console.log('✅ Received POST /api/messages request');
    console.log('Request Body:', req.body);

    await adapter.process(req, res, async (context) => {
        console.log('✅ Processing Activity:', context.activity.type);

        if (context.activity.type === 'message') {
            const userMessage = context.activity.text;
            console.log('✅ User Message:', userMessage);

            try {
                console.log('✅ Sending message to AnythingLLM API...');
                const response = await axios.post('http://13.203.105.162:3001/api/workspace/myworkspace/stream-chat', {
                    message: userMessage,
                    attachments: []
                });

                const data = response.data;
                const llmReply = data.textResponse || 'Sorry, no response from AnythingLLM.';
                console.log('✅ Received response from AnythingLLM API:', llmReply);

                await context.sendActivity(llmReply);
            } catch (error) {
                console.error('❌ Error calling AnythingLLM API:', error.message);
                await context.sendActivity('There was an error processing your request.');
            }
        } else {
            await context.sendActivity(`[${context.activity.type} event detected]`);
        }
    });
});

// Start server
const PORT = process.env.PORT || 3978;
app.listen(PORT, () => {
    console.log(`✅ Bot is listening on port ${PORT}`);
});
