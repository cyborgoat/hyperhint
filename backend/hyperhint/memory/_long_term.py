

from typing import List

from hyperhint.memory._types import Memory


class LongTermMem:
    def __init__(self):
        self.memory:List[Memory] = []

    def add(self, item:Memory):
        self.memory.append(item)

    def get(self, index:int) -> Memory:
        return self.memory[index]
    
    def clear(self):
        self.memory = []
        
    def __str__(self):
        return str(self.memory)
    
    def __repr__(self):
        return f"[LongTermMem]: {self.memory}"
    
    def __len__(self):
        return len(self.memory)
    
    def __getitem__(self, index:int):
        return self.memory[index]
    
    def __setitem__(self, index:int, value:Memory):
        self.memory[index] = value
    
    def __delitem__(self, index:int):
        del self.memory[index]
    
    def __iter__(self):
        return iter(self.memory)
    
    def __next__(self):
        return next(self.memory)
    
    def __contains__(self, item:Memory):
        return item in self.memory
    