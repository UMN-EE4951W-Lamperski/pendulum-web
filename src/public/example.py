# REQUIRED IMPORT! The pendulum will NOT WORK if you do not import this.
from pendulum import System

# Initialize the system
system = System()

# REQUiRED! This initializes the system.
system.initialize()

#
# Add your code here!
#

#REQUIRED! This deinitializes the system, allowing another instance to be initialized.
system.deinitialize()