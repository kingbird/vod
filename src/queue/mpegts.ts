import Queue from 'bull'
import config from '#config/index.js'
import { Media, MediaTs } from '#orm/index.js'
import { createReadStream, statSync } from 'fs'
import { createInterface } from 'readline'
import { dirname, join } from 'path'

const MpegtsQueue = new Queue('Mpegts analyze', config.rdsuri)

// @param jobData  Media 实例json
const callBack:Queue.ProcessCallbackFunction<any> = async(job,done)=>{
    const jobData = job.data as Media
    const hlsContent = createReadStream(jobData.hlsPath)
    let sequence = 1
    let tsExtinf = 0
    for await(const line of createInterface({input:hlsContent})){// 行读文件
        if(line.startsWith("#EXTINF:")){
            tsExtinf = parseFloat(line.replace('#EXTINF:',''))
        } else if (line.endsWith(".ts")){
            const tsPath = join(dirname(jobData.hlsPath),line).replace(/\\/g,'/')      
            const mediaTsObj =  {
                mediaId:jobData.id,
                status:0,
                tsExtinf:tsExtinf,
                tsPath: tsPath,
                tsSize: statSync(tsPath).size,
                tsSeq: sequence
            }
            MediaTs.create(mediaTsObj)
            tsExtinf = 0
            sequence ++
        }
    }
    done()
}

MpegtsQueue.process(callBack)

MpegtsQueue.add({id:1,hlsPath:'data/1/hls/index.m3u8'})