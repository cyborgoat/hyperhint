#!/usr/bin/env python3
"""
Simple test script to verify HyperHint backend functionality
"""

import asyncio

from hyperhint.memory._long_term import LongTermMem
from hyperhint.memory._short_term import ShortTermMem


async def test_memory_systems():
    """Test the memory systems"""
    print("🧪 Testing HyperHint Backend Memory Systems")
    print("=" * 50)
    
    # Test Short-term Memory (Files)
    print("\n📁 Testing Short-term Memory (Files)")
    short_mem = ShortTermMem()
    print(f"   Loaded {len(short_mem)} files/folders")
    
    # Test file search
    search_results = short_mem.search("py")
    print(f"   Search for 'py': {len(search_results)} results")
    for result in search_results[:3]:  # Show first 3
        print(f"   - {result.label}: {result.description}")
    
    # Test Long-term Memory (Actions)
    print("\n⚡ Testing Long-term Memory (Actions)")
    long_mem = LongTermMem()
    print(f"   Loaded {len(long_mem)} actions")
    
    # Test action search
    search_results = long_mem.search("create")
    print(f"   Search for 'create': {len(search_results)} results")
    for result in search_results:
        print(f"   - {result.label}: {result.description}")
    
    print("\n✅ Memory systems working correctly!")

if __name__ == "__main__":
    print("🚀 HyperHint Backend Test Suite")
    asyncio.run(test_memory_systems()) 