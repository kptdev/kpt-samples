import os
import collections
import configparser 
from os.path import exists

CM_PREFIX = "cm." 
DELIMITER = "."
INI_FILE_NAME_ENV = "CM_INI_FILE_NAME"
DEFAULT_INI_FILE = "my.cnf"

def iniFileNameFromEnv():
    iniFromEnv = os.environ[INI_FILE_NAME_ENV]
    return iniFromEnv if iniFromEnv else DEFAULT_INI_FILE

def run():
    config = configparser.ConfigParser()

    iniContent = readFromEnv()
    config.read_dict(iniContent)

    with open(iniFileNameFromEnv(), 'w') as iniFile:
        config.write(iniFile)


def readFromEnv():
    iniContent = collections.defaultdict(dict)
    for envKey, value in os.environ.items():
        if envKey.startswith(CM_PREFIX):
            _, section, key = envKey.split(DELIMITER)
            iniContent[section][key] = value
    return iniContent


if __name__ == "__main__":
    run()
    iniFile = os.path.abspath(iniFileNameFromEnv())
    if not exists(iniFile):
        os.exit(1)
    print(f"Successfully write to {iniFile}.")