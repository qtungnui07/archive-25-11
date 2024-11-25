from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sympy import symbols, Eq, simplify, solve, sympify
from sympy.parsing.latex import parse_latex

app = FastAPI()

class EquationInput(BaseModel):
    latex_or_expression: str
    operation: str
    substitutions: dict = None

class BatchInput(BaseModel):
    equations: list[EquationInput]

@app.post("/process_batch/")
async def process_batch(input_data: BatchInput):
    results = []
    for eq in input_data.equations:
        try:
            if "\\" in eq.latex_or_expression:
                expr = parse_latex(eq.latex_or_expression)
            else:
                expr = sympify(eq.latex_or_expression)

            if eq.operation == "simplify":
                result = simplify(expr)
            elif eq.operation == "solve":
                if isinstance(expr, Eq):
                    result = solve(expr)
                else:
                    result = solve(Eq(expr, 0))
            elif eq.operation == "subs":
                if not eq.substitutions:
                    raise ValueError("Substitutions must be provided for 'subs' operation.")
                result = expr.subs(eq.substitutions)
            else:
                raise ValueError("Unsupported operation. Choose 'solve', 'simplify', or 'subs'.")
            
            results.append({"input": eq.dict(), "result": str(result)})
        except Exception as e:
            results.append({"input": eq.dict(), "error": str(e)})
    
    return {"results": results}

@app.get("/")
async def root():
    return {"message": "API xử lý batch phương trình với cả LaTeX và dạng thông thường"}
