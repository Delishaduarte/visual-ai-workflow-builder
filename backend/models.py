from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class WorkflowNode(BaseModel):
    id: str
    type: str
    position: Dict[str, float]
    data: Dict[str, Any] = {}


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: str | None = None


class Workflow(BaseModel):
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]

class RetryNodeRequest(BaseModel):
    node: WorkflowNode
    incomingValue: str | None = None