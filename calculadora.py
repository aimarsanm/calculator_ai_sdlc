import ast
import operator

_BINARY = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
}
_UNARY = {ast.UAdd: operator.pos, ast.USub: operator.neg}


class CalculatorError(ValueError):
    """Error de cálculo con mensaje apto para el usuario."""


def sumar(a, b):
    return a + b


def restar(a, b):
    return a - b


def multiplicar(a, b):
    return a * b


def dividir(a, b):
    if b == 0:
        raise CalculatorError("División por cero")
    return a / b


def _eval(node):
    if isinstance(node, ast.Expression):
        return _eval(node.body)
    if isinstance(node, ast.Constant) and type(node.value) in (int, float):
        return node.value
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY:
        return _UNARY[type(node.op)](_eval(node.operand))
    if isinstance(node, ast.BinOp) and type(node.op) in _BINARY:
        left, right = _eval(node.left), _eval(node.right)
        if isinstance(node.op, ast.Div):
            return dividir(left, right)
        return _BINARY[type(node.op)](left, right)
    raise CalculatorError("Sintaxis inválida")


def evaluar(expresion):
    """Evalúa una expresión aritmética simple (+, -, *, /) de forma segura."""
    if not isinstance(expresion, str) or not expresion.strip() or len(expresion) > 200:
        raise CalculatorError("Sintaxis inválida")
    try:
        tree = ast.parse(expresion.strip(), mode="eval")
    except SyntaxError:
        raise CalculatorError("Sintaxis inválida") from None
    result = _eval(tree)
    if isinstance(result, float) and result.is_integer():
        return int(result)
    return round(result, 10) if isinstance(result, float) else result
