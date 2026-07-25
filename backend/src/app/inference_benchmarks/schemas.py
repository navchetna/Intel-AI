"""Pydantic schemas for the inference-benchmarks module."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

# Canonical Excel/template column headers, in order. Used for the downloadable
# template and to validate uploads. Keep in sync with `BenchmarkRecordCreate`.
EXCEL_COLUMNS: list[str] = [
    "Timestamp",
    "Platform",
    "Serving_Engine",
    "Model",
    "TP",
    "Num_Deployments",
    "Dataset",
    "Input_Tokens",
    "Output_Tokens",
    "Concurrency",
    "Request_Rate",
    "Mean_TTFT_ms",
    "Median_TTFT_ms",
    "P90_TTFT_ms",
    "Mean_TPOT_ms",
    "Median_TPOT_ms",
    "P90_TPOT_ms",
    "Mean_ITL_ms",
    "Median_ITL_ms",
    "P90_ITL_ms",
    "Request_Throughput",
    "Output_Token_Throughput",
    "Interactivity_tokens_per_sec_per_user",
]


class BenchmarkRecordCreate(BaseModel):
    """One incoming row (from an Excel upload), keyed by Excel headers.

    Field names are snake_case; aliases match the Excel column headers so rows
    parsed from the template validate directly.
    """

    model_config = ConfigDict(populate_by_name=True)

    timestamp: str = Field(alias="Timestamp")
    platform: str = Field(alias="Platform")
    serving_engine: str | None = Field(default=None, alias="Serving_Engine")
    model: str = Field(alias="Model")
    tp: int | None = Field(default=None, alias="TP")
    num_deployments: int | None = Field(default=None, alias="Num_Deployments")
    dataset: str | None = Field(default=None, alias="Dataset")
    input_tokens: int | None = Field(default=None, alias="Input_Tokens")
    output_tokens: int | None = Field(default=None, alias="Output_Tokens")
    concurrency: int | None = Field(default=None, alias="Concurrency")
    request_rate: float | None = Field(default=None, alias="Request_Rate")
    mean_ttft_ms: float | None = Field(default=None, alias="Mean_TTFT_ms")
    median_ttft_ms: float | None = Field(default=None, alias="Median_TTFT_ms")
    p90_ttft_ms: float | None = Field(default=None, alias="P90_TTFT_ms")
    mean_tpot_ms: float | None = Field(default=None, alias="Mean_TPOT_ms")
    median_tpot_ms: float | None = Field(default=None, alias="Median_TPOT_ms")
    p90_tpot_ms: float | None = Field(default=None, alias="P90_TPOT_ms")
    mean_itl_ms: float | None = Field(default=None, alias="Mean_ITL_ms")
    median_itl_ms: float | None = Field(default=None, alias="Median_ITL_ms")
    p90_itl_ms: float | None = Field(default=None, alias="P90_ITL_ms")
    request_throughput: float | None = Field(default=None, alias="Request_Throughput")
    output_token_throughput: float | None = Field(default=None, alias="Output_Token_Throughput")
    interactivity_tokens_per_sec_per_user: float | None = Field(
        default=None, alias="Interactivity_tokens_per_sec_per_user"
    )


class BenchmarkRecord(BenchmarkRecordCreate):
    """A stored row, serialized by snake_case field name for the frontend."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: int


class BenchmarkRecordsResponse(BaseModel):
    total: int
    rows: list[BenchmarkRecord]


# --- Charts -------------------------------------------------------------------


class ChartPoint(BaseModel):
    batch_size: int
    value: float


class TtftSeries(BaseModel):
    input_tokens: int
    points: list[ChartPoint]


class ChartsResponse(BaseModel):
    ttft_vs_batch: list[TtftSeries]
    itl_vs_batch: list[ChartPoint]


# --- Bulk upload --------------------------------------------------------------


class BulkUploadRequest(BaseModel):
    rows: list[dict]


class RowError(BaseModel):
    row: int
    errors: list[str]


class BulkUploadResponse(BaseModel):
    inserted: int
    failed: int
    errors: list[RowError]


# --- Auth ---------------------------------------------------------------------


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str


class CreateUserRequest(BaseModel):
    username: str
    password: str


class UserInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
