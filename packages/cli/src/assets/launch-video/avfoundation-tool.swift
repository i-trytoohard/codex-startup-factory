import Foundation
import AVFoundation
import AppKit

struct Output: Encodable {
  let durationSeconds: Double?
  let width: Double?
  let height: Double?
  let nominalFrameRate: Float?
  let videoCodec: String?
  let audioCodec: String?
  let hasAudio: Bool
}

struct KeyframeRecord: Encodable {
  let index: Int
  let timeSeconds: Double
  let path: String
}

enum ToolError: Error {
  case invalidArguments(String)
  case missingVideoTrack
  case jpegEncodeFailed
}

func fourCC(_ value: FourCharCode) -> String {
  let n = Int(value)
  let bytes = [
    Character(UnicodeScalar((n >> 24) & 255)!),
    Character(UnicodeScalar((n >> 16) & 255)!),
    Character(UnicodeScalar((n >> 8) & 255)!),
    Character(UnicodeScalar(n & 255)!),
  ]
  return String(bytes)
}

func writeJSON<T: Encodable>(_ value: T) throws {
  let encoder = JSONEncoder()
  encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
  let data = try encoder.encode(value)
  if let string = String(data: data, encoding: .utf8) {
    print(string)
  }
}

let args = CommandLine.arguments
guard args.count >= 3 else {
  throw ToolError.invalidArguments("usage: swift avfoundation-tool.swift <inspect|keyframes> <video-path> [output-dir] [times]")
}

let command = args[1]
let videoPath = args[2]
let asset = AVURLAsset(url: URL(fileURLWithPath: videoPath))

switch command {
case "inspect":
  let videoTrack = asset.tracks(withMediaType: .video).first
  let audioTrack = asset.tracks(withMediaType: .audio).first
  let naturalSize = videoTrack?.naturalSize.applying(videoTrack?.preferredTransform ?? .identity) ?? .zero
  let videoCodec = videoTrack
    .flatMap { $0.formatDescriptions.first }
    .map { CMFormatDescriptionGetMediaSubType($0 as! CMFormatDescription) }
    .map(fourCC)
  let audioCodec = audioTrack
    .flatMap { $0.formatDescriptions.first }
    .map { CMFormatDescriptionGetMediaSubType($0 as! CMFormatDescription) }
    .map(fourCC)

  try writeJSON(
    Output(
      durationSeconds: CMTimeGetSeconds(asset.duration),
      width: abs(Double(naturalSize.width)),
      height: abs(Double(naturalSize.height)),
      nominalFrameRate: videoTrack?.nominalFrameRate,
      videoCodec: videoCodec,
      audioCodec: audioCodec,
      hasAudio: audioTrack != nil,
    )
  )
case "keyframes":
  guard args.count >= 5 else {
    throw ToolError.invalidArguments("usage: swift avfoundation-tool.swift keyframes <video-path> <output-dir> <times>")
  }

  guard asset.tracks(withMediaType: .video).first != nil else {
    throw ToolError.missingVideoTrack
  }

  let outputDir = args[3]
  let times = args[4]
    .split(separator: ",")
    .compactMap { Double($0.trimmingCharacters(in: .whitespacesAndNewlines)) }

  try FileManager.default.createDirectory(
    at: URL(fileURLWithPath: outputDir),
    withIntermediateDirectories: true,
  )

  let generator = AVAssetImageGenerator(asset: asset)
  generator.appliesPreferredTrackTransform = true
  generator.requestedTimeToleranceAfter = .zero
  generator.requestedTimeToleranceBefore = .zero

  var records: [KeyframeRecord] = []

  for (index, time) in times.enumerated() {
    let image = try generator.copyCGImage(at: CMTime(seconds: time, preferredTimescale: 600), actualTime: nil)
    let bitmap = NSBitmapImageRep(cgImage: image)
    guard let data = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.84]) else {
      throw ToolError.jpegEncodeFailed
    }

    let fileName = String(format: "keyframe-%03d.jpg", index + 1)
    let filePath = URL(fileURLWithPath: outputDir).appendingPathComponent(fileName).path
    try data.write(to: URL(fileURLWithPath: filePath))
    records.append(KeyframeRecord(index: index, timeSeconds: time, path: filePath))
  }

  try writeJSON(records)
default:
  throw ToolError.invalidArguments("unknown command \(command)")
}
