# Medbot — Commented Code Guide

This is an annotated copy of the uploaded project. Explanatory module docstrings were added to Python files, and this guide describes the major components and how to navigate them. The program logic is otherwise preserved.

## Important security note
The uploaded archive contained API credentials. Those values have been removed from this copy and replaced with placeholders in `config/api_keys.json`. Revoke/rotate the exposed keys with their providers. Add the real local config file to `.gitignore`; never commit credentials or share them in screenshots.

## Start here

1. **`main.py`** — application orchestration. Find the imports first to see the modules the assistant can use. Then review configuration constants, API-key loading, prompt loading, tool declarations, and the audio/conversation loop.
2. **`core/prompt.txt`** — the natural-language instructions sent to the model. This controls persona, response style, and tool-use instructions; it is not a substitute for backend safety checks.
3. **`ui.py`** — PyQt6 desktop window, visual styling, widgets, and user interactions.
4. **`or_client.py`** — OpenRouter HTTP client for text and image-capable model requests, including model lists, headers, retries, and rate-limit behavior.
5. **`memory/`** — persistence and formatting of remembered information. Review this carefully before using with real health data.
6. **`agent/`** — planning, task queue, execution, and error-handling for multi-step tasks.
7. **`actions/`** — individual tool implementations (browser, computer control, files, reminders, weather, messaging, and other capabilities). These are general desktop-assistant actions, not healthcare-specific medical tools.

## Module map

| File/folder | What it does |
|---|---|
| `main.py` | Connects UI, live audio/model session, prompt, memory, and tools. |
| `ui.py` | Renders the desktop interface and emits/handles UI events. |
| `or_client.py` | Sends model requests through OpenRouter. |
| `core/prompt.txt` | Assistant persona and behavior rules. |
| `memory/memory_manager.py` | Reads, extracts, formats, and updates remembered facts. |
| `memory/config_manager.py` | Memory-related configuration helpers. |
| `agent/planner.py` | Creates plans for multi-step requests. |
| `agent/executor.py` | Runs planned actions. |
| `agent/task_queue.py` | Tracks queued tasks. |
| `agent/error_handler.py` | Handles agent failures. |
| `actions/*.py` | Feature-specific tools imported by the main app. |
| `requirements.txt` | Python dependencies needed to install the project. |
| `setup.py` | Package/build setup metadata or configuration. |
| `config/api_keys.json` | Local credentials/configuration; now contains placeholders only. |

## Healthcare hackathon considerations

This repository appears to be a general desktop/voice assistant rather than a healthcare application. Before using it for health conversations, remove or disable unrelated computer-control, messaging, file, and browser actions unless they are essential. Do not send real patient information to external model APIs without a suitable privacy/security review and user disclosure. Add a healthcare-specific system prompt, a separately implemented emergency escalation/safety layer, trusted-source retrieval, and tests with non-realistic synthetic scenarios. Do not present the app as diagnosing, prescribing, or replacing a clinician.

## Run / configure

Install dependencies listed in `requirements.txt`, configure your own API credentials locally, then follow the repository's setup instructions. The original README was effectively empty, so consult the dependency list and entry point for environment-specific setup. This archive has not been executed or runtime-tested.
