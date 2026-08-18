from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import Workflow
from workflow_engine import execute_workflow, WorkflowError

app = FastAPI()

# Without this, your browser will block requests from localhost:5173
# to localhost:8000 due to the same-origin security policy (CORS).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Simple endpoint to confirm the server is alive and reachable."""
    return {"status": "ok"}


@app.post("/workflow/validate")
def validate_workflow(workflow: Workflow):
    """
    Checks the workflow can be executed WITHOUT actually running it —
    useful for the frontend to show errors before hitting "Run".
    """
    from workflow_engine import topological_sort, find_disconnected_nodes

    disconnected = find_disconnected_nodes(workflow)
    if disconnected:
        raise HTTPException(status_code=400, detail=f"Disconnected nodes: {disconnected}")

    try:
        execution_order, _ = topological_sort(workflow)
    except WorkflowError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "valid", "executionOrder": execution_order}


@app.post("/workflow/run")
def run_workflow(workflow: Workflow):
    """
    Receives the full workflow JSON from React, executes it node by
    node in dependency order, and returns each node's output.
    """
    try:
        return execute_workflow(workflow)
    except WorkflowError as e:
        raise HTTPException(status_code=400, detail=str(e))