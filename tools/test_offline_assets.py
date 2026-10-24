import json
import unittest
from pathlib import PureWindowsPath

import build_offline_assets


class OfflineInventoryTest(unittest.TestCase):
    def test_urls_are_posix_and_scripts_stay_in_the_shell(self):
        source, _, count = build_offline_assets.build()
        files = json.loads(source.split(' = ', 1)[1].rstrip(';\n'))['files']
        self.assertEqual(count, len(files))
        self.assertIn('assets/lipsync/animals_01/en/cat.json', files)
        self.assertTrue(all('\\' not in key for key in files))
        self.assertTrue(all(not key.endswith('.js') for key in files))
        self.assertEqual(files['assets/audio/animals_01/en/cat.mp3']['type'], 'audio/mpeg')

    def test_lipsync_urls_are_platform_independent(self):
        # Native Windows path conversion was the portability regression.
        audio = 'assets/audio/animals_01/en/cat.mp3'
        self.assertIn('\\', str(PureWindowsPath(audio)))
        source, _, _ = build_offline_assets.build()
        self.assertIn('assets/lipsync/animals_01/en/cat.json', source)
        self.assertNotIn('assets\\\\lipsync', source)


if __name__ == '__main__':
    unittest.main()
