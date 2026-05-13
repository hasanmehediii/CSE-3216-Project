import time
import timeit
import threading

from eager_singleton        import EagerMongoConnection
from lazy_singleton         import LazyMongoConnection
from synchronized_singleton import SynchronizedMongoConnection
from double_checked_singleton import DoubleCheckedMongoConnection
from bill_pugh_singleton    import BillPughMongoConnection
from enum_singleton         import EnumMongoConnection

def section(title):
    print(f"\n{'═' * 65}")
    print(f"  {title}")
    print(f"{'═' * 65}")

def divider():
    print(f"  {'─' * 63}")

def experiment_1_instance_validation():
    section("EXPERIMENT 1 — INSTANCE VALIDATION")

    tests = [
        ("EagerMongoConnection",        lambda: EagerMongoConnection()),
        ("LazyMongoConnection",         lambda: LazyMongoConnection()),
        ("SynchronizedMongoConnection", lambda: SynchronizedMongoConnection()),
        ("DoubleCheckedMongoConnection",lambda: DoubleCheckedMongoConnection()),
        ("BillPughMongoConnection",     lambda: BillPughMongoConnection()),
        ("EnumMongoConnection",         lambda: EnumMongoConnection.INSTANCE),
    ]

    print(f"\n  {'Class':<32} {'id — call 1':>18} {'id — call 2':>18} {'id — call 3':>18}  Result")
    divider()

    for name, getter in tests:
        a = getter()
        b = getter()
        c = getter()
        same = id(a) == id(b) == id(c)
        result = "✓ Single instance" if same else "✗ Multiple instances!"
        print(f"  {name:<32} {id(a):>18} {id(b):>18} {id(c):>18}  {result}")

    print("\n  Conclusion: All three calls must return the same id for a correct Singleton.")

def _thread_worker(getter, results, index, start_gate):
    """Each thread waits, then calls the getter and stores object id."""
    start_gate.wait()  # force simultaneous access to maximize race chances
    obj = getter()
    results[index] = obj  # keep reference alive to avoid id() reuse artifacts


def run_thread_test(name, reset_fn, getter, n_threads=10, extra_check=None):
    reset_fn()                              # fresh state before spawning threads

    start_gate = threading.Event()
    results  = [None] * n_threads
    threads  = [
        threading.Thread(target=_thread_worker, args=(getter, results, i, start_gate))
        for i in range(n_threads)
    ]

    for t in threads:
        t.start()
    start_gate.set()
    for t in threads:
        t.join()

    unique_ids = {id(obj) for obj in results}
    safe = len(unique_ids) == 1
    if extra_check is not None:
        extra = extra_check()
        if isinstance(extra, int) and extra > 1:
            safe = False
            status = f"✗ NOT SAFE  ({extra} constructor runs detected)"
            print(f"  {name:<32}  unique IDs: {len(unique_ids):>2}   {status}")
            return

    status = "✓ THREAD-SAFE" if safe else f"✗ NOT SAFE  ({len(unique_ids)} different instances returned)"
    print(f"  {name:<32}  unique IDs: {len(unique_ids):>2}   {status}")


def experiment_2_thread_safety():
    section("EXPERIMENT 2 — THREAD SAFETY  (10 concurrent threads)")

    print(f"\n  {'Class':<32}  {'Outcome'}")
    divider()

    run_thread_test(
        "EagerMongoConnection",
        lambda: None,                       # nothing to reset — already built
        lambda: EagerMongoConnection(),
    )
    run_thread_test(
        "LazyMongoConnection",
        lambda: (setattr(LazyMongoConnection, '_instance', None), setattr(LazyMongoConnection, '_creation_count', 0)),
        lambda: LazyMongoConnection(),
        extra_check=lambda: LazyMongoConnection._creation_count,
    )
    run_thread_test(
        "SynchronizedMongoConnection",
        lambda: setattr(SynchronizedMongoConnection, '_instance', None),
        lambda: SynchronizedMongoConnection(),
    )
    run_thread_test(
        "DoubleCheckedMongoConnection",
        lambda: setattr(DoubleCheckedMongoConnection, '_instance', None),
        lambda: DoubleCheckedMongoConnection(),
    )
    run_thread_test(
        "BillPughMongoConnection",
        lambda: (
            setattr(BillPughMongoConnection._SingletonHelper, 'instance', None),
            setattr(BillPughMongoConnection, '_creation_count', 0),
        ),
        lambda: BillPughMongoConnection(),
        extra_check=lambda: BillPughMongoConnection._creation_count,
    )
    run_thread_test(
        "EnumMongoConnection",
        lambda: None,                       # Enum member is fixed; no reset
        lambda: EnumMongoConnection.INSTANCE,
    )

    print("""
  Notes
  ─────
  • Lazy has an intentional 50 ms sleep that widens the race window so the
    problem shows up clearly.  In a real app with no sleep it might look safe
    but still isn't guaranteed.
  • Eager and Enum are always safe: their instances exist before any thread runs.
  • Synchronized, Double-Checked, and Bill Pugh use locks, so they stay safe.
""")

def measure_init(reset_fn, getter):
    """Time the very first call after resetting the singleton. Returns ms."""
    reset_fn()
    t0 = time.perf_counter()
    getter()
    return (time.perf_counter() - t0) * 1000   # ms


def measure_access(getter, iterations=50_000):
    """Average time per call in µs when instance already exists."""
    total = timeit.timeit(getter, number=iterations)
    return (total / iterations) * 1_000_000    # µs


def experiment_3_performance():
    section("EXPERIMENT 3 — PERFORMANCE COMPARISON")

    configs = [
        (
            "EagerMongoConnection",
            lambda: None,
            lambda: EagerMongoConnection(),
        ),
        (
            "LazyMongoConnection",
            lambda: setattr(LazyMongoConnection, '_instance', None),
            lambda: LazyMongoConnection(),
        ),
        (
            "SynchronizedMongoConnection",
            lambda: setattr(SynchronizedMongoConnection, '_instance', None),
            lambda: SynchronizedMongoConnection(),
        ),
        (
            "DoubleCheckedMongoConnection",
            lambda: setattr(DoubleCheckedMongoConnection, '_instance', None),
            lambda: DoubleCheckedMongoConnection(),
        ),
        (
            "BillPughMongoConnection",
            lambda: setattr(BillPughMongoConnection._SingletonHelper, 'instance', None),
            lambda: BillPughMongoConnection(),
        ),
        (
            "EnumMongoConnection",
            lambda: None,
            lambda: EnumMongoConnection.INSTANCE,
        ),
    ]

    print(f"\n  3a. Initialization Time  (first call, after reset)\n")
    print(f"  {'Class':<32}  {'Init time (ms)':>16}")
    divider()

    for name, reset, getter in configs:
        ms = measure_init(reset, getter)
        print(f"  {name:<32}  {ms:>14.3f} ms")

    print("""
  Note: Eager and Enum show ~0 ms because the MongoClient was built at
  import time, not during the timed call.  The 50 ms sleep in the other
  four implementations is intentional (to expose race conditions in
  Experiment 2) — remove it for production code.
""")

    EagerMongoConnection()
    LazyMongoConnection()
    SynchronizedMongoConnection()
    DoubleCheckedMongoConnection()
    BillPughMongoConnection()
    _ = EnumMongoConnection.INSTANCE

    ITERATIONS = 50_000
    print(f"  3b. Repeated-Access Time  ({ITERATIONS:,} calls, average per call)\n")
    print(f"  {'Class':<32}  {'Avg time per call (µs)':>24}")
    divider()

    for name, _reset, getter in configs:
        µs = measure_access(getter, ITERATIONS)
        print(f"  {name:<32}  {µs:>22.4f} µs")

    print("""
  Interpretation
  ──────────────
  • Eager / Enum / Lazy     — cheapest per call (simple attribute lookup, no lock).
  • Double-Checked Locking  — near-free once initialized; the outer `if` short-
                              circuits before touching the lock.
  • Synchronized Method     — slowest: acquires the lock on EVERY call even after
                              the instance is long since created.
  • Bill Pugh               — similar to Double-Checked in practice.
""")

if __name__ == "__main__":
    experiment_1_instance_validation()
    experiment_2_thread_safety()
    experiment_3_performance()

    section("ALL EXPERIMENTS COMPLETE")
    print()