# Encode DeAI Final Project - Crypto Voice Assistant

A voice-controlled cryptocurrency assistant that allows users to check balances, send transactions, and manage their crypto assets using natural language commands.

## Overview

This project implements a voice-first interface for cryptocurrency operations, making blockchain interactions more accessible and intuitive. Users can perform common crypto operations using voice commands or text input as a fallback option.

## Features

### Voice Interface
- **Voice Command Processing**: Convert user's spoken instructions to text
- **Voice Response**: Convert system messages back to speech
- **Text Fallback**: Support for text commands when voice isn't practical

### Crypto Operations
- **Balance Inquiries**: Check current balance of connected wallet
- **Send Transactions**: Transfer crypto to contacts or addresses
- **Transaction History**: Review past transactions
- **Address Book**: Send to predefined contacts (e.g., "Send money to Kevin")

### User Experience
- **Transaction Confirmations**: Voice verification before executing transactions
- **Success Notifications**: Audible confirmation of completed operations
- **Intuitive UI**: Clean interface with visual feedback

## Sample User Flows

### Checking Balance
1. User: *"What's my current balance?"* (voice)
2. Assistant: *"Your current balance is 0.235 ETH, which is approximately $452.38 USD."* (voice)

### Sending Crypto
1. User: *"Send 0.05 ETH to Kevin"* (voice)
2. Assistant: *"I will send 0.05 ETH to Kevin. Please confirm this transaction."* (voice)
3. User: *"Confirm"* (voice)
4. Assistant: *"Transaction successful. You sent 0.05 ETH to Kevin."* (voice)

### Viewing History
1. User: *"Show me my recent transactions"* (voice)
2. Assistant: *Lists recent transactions* (voice)

## Tech Stack

### Frontend
- Next JS
- Tailwind CSS

### Voice Processing
- [Speech to Text](https://platform.openai.com/docs/guides/speech-to-text) using OpenAI gpt-4o-transcribe
- [Text to Speech](https://platform.openai.com/docs/guides/text-to-speech) using OpenAI gpt-4o-mini-tts

### Blockchain Integration
- Ethers.js for blockchain interactions
- OpenAI for intelligent transaction processing
- Local Hardhat node for development and testing

### Development Environment
- **Local Node**: Run a local Ethereum node for development
  ```bash
  npm run start-node
  ```
- **Chat Agent**: Interact with the agent via command line
  ```bash
  npm run chat-agent
  ```


## Contributors
- joyjsmun (Unique ID: OFVwFA)
- ifanzalukhu97 (Unique ID: S3lFve)
- superical (Unique ID: uiZaHk)
- nvinnikov (Unique ID: VvZfPu)
- Add more contributors...


