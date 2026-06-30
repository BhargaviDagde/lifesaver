"""
Central model configuration for all agents.

Current backend: Groq (free, no billing) via LiteLLM connector.
Swap AGENT_MODEL to switch all agents at once.

To switch back to Gemini once quota is available:
  AGENT_MODEL = "gemini-flash-latest"  # and set GOOGLE_API_KEY + GOOGLE_GENAI_USE_VERTEXAI=false
"""

import os
from google.adk.models.lite_llm import LiteLlm

# --- Active model ---
# Uses LiteLlm wrapper so ADK can call Groq's OpenAI-compatible API.
# Requires: GROQ_API_KEY env var (free at console.groq.com)
def get_model():
    """Return the model object to use for all LlmAgent instances."""
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        return LiteLlm(model="groq/llama-3.3-70b-versatile")

    # Fallback: Gemini Developer API (requires GOOGLE_API_KEY with working quota)
    google_key = os.environ.get("GOOGLE_API_KEY")
    if google_key:
        return "gemini-flash-latest"

    raise RuntimeError(
        "No LLM backend configured. Set GROQ_API_KEY (free at console.groq.com) "
        "or GOOGLE_API_KEY (aistudio.google.com) in backend/.env"
    )
