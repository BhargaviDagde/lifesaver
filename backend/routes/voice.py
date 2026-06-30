"""
Voice route — WebSocket endpoint that relays audio between the frontend
and Gemini Live API via ADK bidi-streaming.

Pattern (per spec section 7):
  Frontend mic → WebSocket to this endpoint → ADK LiveRequestQueue
  → Gemini Live API → transcript + actions back to frontend

Phase 0: stub WebSocket that echoes a placeholder message.
Phase 5: full ADK bidi-streaming implementation.

Reference docs: https://google.github.io/adk-docs/streaming/
Voice model: confirm current name at https://ai.google.dev/gemini-api/docs/live-api
"""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voice")


@router.websocket("/ws")
async def voice_websocket(websocket: WebSocket):
    """
    Bidi-streaming WebSocket relay for voice input.

    Phase 0 stub — accepts connection and sends a placeholder.
    Full implementation in Phase 5 (ADK LiveRequestQueue + Runner.run_live).
    """
    await websocket.accept()
    logger.info("Voice WebSocket connection opened")

    try:
        await websocket.send_json(
            {
                "type": "status",
                "message": "Voice endpoint connected. Full streaming wired in Phase 5.",
            }
        )

        while True:
            data = await websocket.receive_bytes()
            # TODO Phase 5: forward audio chunks to ADK LiveRequestQueue
            # and stream transcript + agent responses back to client
            await websocket.send_json(
                {
                    "type": "transcript",
                    "text": "[voice streaming not yet implemented]",
                }
            )

    except WebSocketDisconnect:
        logger.info("Voice WebSocket disconnected")
    except Exception as e:
        logger.error("Voice WebSocket error: %s", e)
        await websocket.close(code=1011)
