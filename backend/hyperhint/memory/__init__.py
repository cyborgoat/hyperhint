from ._types import Memory, Action, Suggestion
from ._short_term import ShortTermMem
from ._long_term import LongTermMem

# Create global instances
short_term_memory = ShortTermMem()
long_term_memory = LongTermMem()

__all__ = ["Memory", "Action", "Suggestion", "ShortTermMem", "LongTermMem", "short_term_memory", "long_term_memory"]
