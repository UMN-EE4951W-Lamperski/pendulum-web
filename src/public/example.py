from pendulum import System               # REQUIRED import to use the inverted pendulum
from time import sleep                    # OPTIONAL import, needed to use the sleep function

sys = System()                            # Create System object. This is REQUIRED to use the inverted pendulum.
sys.initialize()                          # Initialize the inverted pendulum. This is REQUIRED. The pendulum will move all the way to the left, then all the way to the right, then go to the center and pause for 1 second.

ang,lin = sys.measure()                   # Measure the angular position of the pendulum, and the linear position of the sled.

                                          # This example moves the inverted pendulum back and forth 10 times.
counter = 0
while (counter < 10):                     # Loop 10 times

    sleep(0.2)                            # Sleep for 0.2 seconds
    sys.torque(5)                         # Apply a torque of 5. The max is 80. The inverted pendulum will move the right.

    while lin < 10:                       # Loop while the linear position of the sled is less than 10 inches right of center.
        ang,lin = sys.measure()           # Measure again
        sleep(0.01)                       # Sleep for 0.01 seconds

    sys.torque(0)                         # Apply a torque of 0. This will let the pendulum coast in whichever direction it was headed. It will stop shortly after.
    sleep(0.6)                            # Sleep for 0.6 seconds. This gives the pendulum time to stop and stay idle. This isn't required.
    sys.torque(-5)                        # Apply a torque of -5. The max is -80. This is still a torque of 5, but in the opposite direction. The pendulum moves left.

    while lin > -10:                      # Loop until a linear position of -10 (10 inches left of center) is measured.
        ang,lin = sys.measure()
        sleep(0.01)

    sys.torque(0)                         # Have the pendulum coast
    sleep(0.1)                            # Sleep for 0.1 seconds

    counter += 1                          # increment the counter variable

sys.return_home()                         # REQUIRED function call, always return home at the end of every run.
